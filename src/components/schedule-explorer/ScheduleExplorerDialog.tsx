import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close,
  FilterList,
  GridView,
  Search,
  Star,
  Timelapse,
  CalendarToday,
} from '@mui/icons-material';
import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { EmptyState } from '../EmptyState';
import CalendarView from '../CalendarView';
import type { Course } from '../../types';
import type { GeneratedSchedule, SearchResult } from '../../utils/schedule-types';
import { clusterSchedules } from '../../utils/schedule-generator';

// Constants
const MAX_DISPLAY_SCHEDULES = 50;
const CLUSTER_COUNT = 5;
const SCORE_EXCELLENT = 80;
const SCORE_GOOD = 60;
const MATCH_EXCELLENT = 0.8;
const MATCH_GOOD = 0.6;

interface ScheduleExplorerDialogProps {
  open: boolean;
  onClose: () => void;
  generatedSchedules: GeneratedSchedule[];
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
  onApplySchedule: (schedule: GeneratedSchedule) => void;
  courses: Course[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  searching: boolean;
  searchResults: SearchResult[];
  showConflicting: boolean;
  onToggleConflicting: () => void;
}

export const ScheduleExplorerDialog = memo(function ScheduleExplorerDialog({
  open,
  onClose,
  generatedSchedules,
  selectedSchedule,
  onSelectSchedule,
  onApplySchedule,
  courses,
  searchQuery,
  onSearchChange,
  onSearch,
  searching,
  searchResults,
  showConflicting,
  onToggleConflicting,
}: ScheduleExplorerDialogProps) {
  const theme = useTheme();
  const [explorerTab, setExplorerTab] = useState(0);
  const [filterTime, setFilterTime] = useState<'all' | 'morning' | 'afternoon'>('all');

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const conflictFreeSchedules = useMemo(
    () => generatedSchedules.filter((s) => s.conflicts.length === 0),
    [generatedSchedules],
  );

  const conflictingSchedules = useMemo(
    () => generatedSchedules.filter((s) => s.conflicts.length > 0),
    [generatedSchedules],
  );

  const activeSchedules = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.map((r) => r.schedule);
    }
    let filtered = showConflicting ? generatedSchedules : conflictFreeSchedules;

    // Apply time filter
    if (filterTime !== 'all') {
      filtered = filtered.filter((schedule) => {
        const hasMorning = schedule.sections.some((s) =>
          s.timeSlots.some((ts) => {
            const hour = parseInt(ts.startTime.split(':')[0]);
            return hour < 12;
          }),
        );
        const hasAfternoon = schedule.sections.some((s) =>
          s.timeSlots.some((ts) => {
            const hour = parseInt(ts.startTime.split(':')[0]);
            return hour >= 12;
          }),
        );
        return filterTime === 'morning' ? hasMorning : hasAfternoon;
      });
    }

    return [...filtered].sort((a, b) => b.score - a.score);
  }, [searchResults, generatedSchedules, conflictFreeSchedules, showConflicting, filterTime]);

  const clusteredSchedules = useMemo(() => {
    if (activeSchedules.length === 0) return [];
    const schedulesToCluster =
      searchResults.length > 0 ? searchResults.map((r) => r.schedule) : activeSchedules;
    return clusterSchedules(schedulesToCluster, CLUSTER_COUNT);
  }, [activeSchedules, searchResults]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
    setFilterTime('all');
  }, [onSearchChange]);

  const hasActiveFilters = !!searchQuery.trim() || filterTime !== 'all';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: { xs: '95vh', sm: '90vh', md: '85vh' },
          borderRadius: 4,
          bgcolor: 'surface.container.high',
        },
      }}
    >
      <DialogTitle sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <GridView sx={{ color: 'accent.main' }} />
              <Typography variant="h6" fontWeight={700}>
                Schedule Explorer
              </Typography>
              <Chip
                label={`${activeSchedules.length}`}
                size="small"
                color={activeSchedules.length > 0 ? 'success' : 'default'}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              />
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              {conflictingSchedules.length > 0 && (
                <Chip
                  label={`${conflictingSchedules.length} conflicts`}
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={onToggleConflicting}
                  sx={{ cursor: 'pointer', borderRadius: 2 }}
                />
              )}
              <IconButton onClick={onClose} sx={{ borderRadius: 2 }}>
                <Close />
              </IconButton>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder='Try: "morning classes" or "no Friday"'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {hasActiveFilters ? (
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        edge="end"
                        sx={{ mr: 0.5, borderRadius: 2 }}
                        title="Clear search and filters"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton onClick={onSearch} edge="end" disabled={!searchQuery.trim()}>
                        <Search />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
                sx: { borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.1) },
              }}
            />
            <IconButton
              onClick={() =>
                setFilterTime(
                  filterTime === 'all' ? 'morning' : filterTime === 'morning' ? 'afternoon' : 'all',
                )
              }
              sx={{
                borderRadius: 3,
                bgcolor: filterTime !== 'all' ? alpha(theme.palette.primary.main, 0.1) : undefined,
              }}
              title="Filter by time of day"
            >
              <Timelapse />
            </IconButton>
          </Stack>

          {hasActiveFilters && (
            <Stack direction="row" spacing={1}>
              {filterTime !== 'all' && (
                <Chip
                  label={`Time: ${filterTime}`}
                  size="small"
                  onDelete={() => setFilterTime('all')}
                  sx={{ borderRadius: 2 }}
                />
              )}
              {searching && (
                <Typography variant="caption" color="text.secondary">
                  Searching...
                </Typography>
              )}
              {searchResults.length > 0 && !searching && (
                <Typography variant="caption" color="text.secondary">
                  Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {activeSchedules.length === 0 && !searching ? (
          <EmptyState
            icon={
              generatedSchedules.length > 0 ? (
                <FilterList sx={{ fontSize: 40 }} />
              ) : (
                <CalendarToday sx={{ fontSize: 40 }} />
              )
            }
            title={
              generatedSchedules.length > 0
                ? hasActiveFilters
                  ? 'No matching schedules'
                  : 'No viable schedules found'
                : 'No schedules generated yet'
            }
            description={
              generatedSchedules.length > 0
                ? hasActiveFilters
                  ? 'Try adjusting your search or clearing filters to see more results'
                  : 'Try adjusting your course selections or preferences'
                : 'Generate schedule alternatives to explore different combinations'
            }
            action={
              hasActiveFilters && (
                <Button variant="outlined" onClick={handleClearSearch} sx={{ borderRadius: 3 }}>
                  Clear Filters
                </Button>
              )
            }
            variant="fullscreen"
          />
        ) : (
          <Grid container sx={{ height: '100%' }}>
            <Grid
              size={{ xs: 12, md: 5 }}
              sx={{
                borderRight: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                overflow: 'auto',
              }}
            >
              <Tabs
                value={explorerTab}
                onChange={(_, v) => setExplorerTab(v)}
                variant="fullWidth"
                sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}
              >
                <Tab label={`All (${activeSchedules.length})`} sx={{ borderRadius: 2 }} />
                {clusteredSchedules.length > 0 && <Tab label="Grouped" />}
              </Tabs>

              <ScheduleList
                explorerTab={explorerTab}
                searchResults={searchResults}
                activeSchedules={activeSchedules}
                clusteredSchedules={clusteredSchedules}
                selectedSchedule={selectedSchedule}
                onSelectSchedule={onSelectSchedule}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }} sx={{ overflow: 'auto' }}>
              {selectedSchedule ? (
                <ScheduleDetails
                  selectedSchedule={selectedSchedule}
                  courses={courses}
                  onApply={() => onApplySchedule(selectedSchedule)}
                />
              ) : (
                <EmptyState
                  icon={<GridView sx={{ fontSize: 32 }} />}
                  title="Select a schedule"
                  description="Select a schedule from the list to view details"
                  variant="compact"
                />
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
});

// Schedule List Component
interface ScheduleListProps {
  explorerTab: number;
  searchResults: SearchResult[];
  activeSchedules: GeneratedSchedule[];
  clusteredSchedules: ReturnType<typeof clusterSchedules>;
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
}

const ScheduleList = memo(function ScheduleList({
  explorerTab,
  searchResults,
  activeSchedules,
  clusteredSchedules,
  selectedSchedule,
  onSelectSchedule,
}: ScheduleListProps) {
  if (explorerTab === 0) {
    const displayList = searchResults.length > 0 ? searchResults : activeSchedules;

    return (
      <Stack spacing={1} p={2}>
        {displayList.slice(0, MAX_DISPLAY_SCHEDULES).map((item, idx) => {
          const isSearchResult = searchResults.length > 0;
          const genSched = isSearchResult
            ? (item as SearchResult).schedule
            : (item as GeneratedSchedule);
          const relevanceScore = isSearchResult ? (item as SearchResult).relevanceScore : undefined;
          const explanation = isSearchResult ? (item as SearchResult).explanation : undefined;

          return (
            <ScheduleListItem
              key={genSched.id}
              schedule={genSched}
              idx={idx}
              isSelected={selectedSchedule?.id === genSched.id}
              isSearchResult={isSearchResult}
              relevanceScore={relevanceScore}
              explanation={explanation}
              onSelect={() => onSelectSchedule(genSched)}
            />
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={2} p={2}>
      {clusteredSchedules.map((cluster, cIdx) => (
        <ClusterGroup
          key={cIdx}
          cluster={cluster}
          selectedSchedule={selectedSchedule}
          onSelectSchedule={onSelectSchedule}
        />
      ))}
    </Stack>
  );
});

// Extracted Schedule List Item
interface ScheduleListItemProps {
  schedule: GeneratedSchedule;
  idx: number;
  isSelected: boolean;
  isSearchResult: boolean;
  relevanceScore?: number;
  explanation?: string;
  onSelect: () => void;
}

const ScheduleListItem = memo(function ScheduleListItem({
  schedule,
  idx,
  isSelected,
  isSearchResult,
  relevanceScore,
  explanation,
  onSelect,
}: ScheduleListItemProps) {
  return (
    <Card
      sx={{
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: 3,
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                {idx === 0 && !isSearchResult && (
                  <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                )}
                <Typography variant="body2" fontWeight={600}>
                  {schedule.totalCredits} credits
                </Typography>
              </Stack>
              {isSearchResult && relevanceScore !== undefined ? (
                <Chip
                  label={`${Math.round(relevanceScore * 100)}% match`}
                  size="small"
                  color={
                    relevanceScore >= MATCH_EXCELLENT
                      ? 'success'
                      : relevanceScore >= MATCH_GOOD
                        ? 'warning'
                        : 'default'
                  }
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                />
              ) : (
                <Chip
                  label={schedule.score}
                  size="small"
                  color={
                    schedule.score >= SCORE_EXCELLENT
                      ? 'success'
                      : schedule.score >= SCORE_GOOD
                        ? 'warning'
                        : 'error'
                  }
                  sx={{ borderRadius: 2, fontWeight: 600, minWidth: 48 }}
                />
              )}
            </Stack>
            {explanation && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {explanation}
              </Typography>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});

// Cluster Group Component
interface ClusterGroupProps {
  cluster: { label: string; schedules: GeneratedSchedule[] };
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
}

const ClusterGroup = memo(function ClusterGroup({
  cluster,
  selectedSchedule,
  onSelectSchedule,
}: ClusterGroupProps) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} mb={1}>
        {cluster.label} ({cluster.schedules.length})
      </Typography>
      <Stack spacing={1}>
        {cluster.schedules.slice(0, MAX_DISPLAY_SCHEDULES).map((genSched) => (
          <Card
            key={genSched.id}
            sx={{
              cursor: 'pointer',
              border: selectedSchedule?.id === genSched.id ? 2 : 1,
              borderColor: selectedSchedule?.id === genSched.id ? 'primary.main' : 'divider',
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 3,
            }}
            onClick={() => onSelectSchedule(genSched)}
          >
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" fontWeight={600}>
                  {genSched.totalCredits} credits
                </Typography>
                <Chip
                  label={genSched.score}
                  size="small"
                  color={genSched.score >= SCORE_EXCELLENT ? 'success' : 'default'}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
});

// Schedule Details Component
interface ScheduleDetailsProps {
  selectedSchedule: GeneratedSchedule;
  courses: Course[];
  onApply: () => void;
}

function ScheduleDetails({ selectedSchedule, courses, onApply }: ScheduleDetailsProps) {
  const theme = useTheme();

  return (
    <Stack sx={{ height: '100%', position: 'relative' }} p={3}>
      <Box sx={{ overflow: 'auto', pb: 7 }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap">
          <Typography variant="h6" fontWeight={700}>
            Schedule Details
          </Typography>
          <Chip
            label={`Score: ${selectedSchedule.score}`}
            color={selectedSchedule.score >= SCORE_EXCELLENT ? 'success' : 'default'}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          />
          <Chip
            label={`${selectedSchedule.totalCredits} Credits`}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 600 }}
          />
        </Stack>

        <Box sx={{ height: { xs: 300, sm: 400 }, mb: 2 }}>
          <CalendarView
            sections={selectedSchedule.sections}
            courses={courses}
            conflicts={selectedSchedule.conflicts}
          />
        </Box>

        {selectedSchedule.conflicts.length > 0 && (
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="warning.main" mb={1}>
              ⚠️ Conflicts:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {selectedSchedule.conflicts.map((c: string, i: number) => (
                <li key={i}>
                  <Typography variant="caption" color="warning.main">
                    {c}
                  </Typography>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          pt: 2,
          bgcolor: 'surface.container.high',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Button
          variant="contained"
          color="accent"
          fullWidth
          sx={{ borderRadius: 3, py: 1.5, fontWeight: 600 }}
          onClick={onApply}
        >
          Apply This Schedule
        </Button>
      </Box>
    </Stack>
  );
}
