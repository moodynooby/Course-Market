import { CalendarToday, Close, FilterList, GridView, Search, Star } from '@mui/icons-material';
import {
  alpha,
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
  useTheme,
} from '@mui/material';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Course } from '../../types';
import type { ScheduleDiagnostics } from '../../utils/schedule-diagnostics';
import { groupSchedulesByStructure } from '../../utils/schedule-generator';
import type { GeneratedSchedule, SearchResult } from '../../utils/schedule-types';
import CalendarView from '../CalendarView';
import { EmptyState } from '../EmptyState';
import { ScheduleDiagnosticsPanel } from './ScheduleDiagnosticsPanel';

const MAX_DISPLAY_SCHEDULES = 50;
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
  searchResults: SearchResult[];
  showConflicting: boolean;
  onToggleConflicting: () => void;
  diagnostics?: ScheduleDiagnostics | null;
  onDiagnosticAction?: (action: string) => void;
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
  searchResults,
  showConflicting,
  onToggleConflicting,
  diagnostics,
  onDiagnosticAction,
}: ScheduleExplorerDialogProps) {
  const theme = useTheme();
  const [explorerTab, setExplorerTab] = useState(0);

  useEffect(() => {
    if (open) {
      setExplorerTab(0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const conflictingSchedules = useMemo(
    () => generatedSchedules.filter((s) => s.conflicts.length > 0),
    [generatedSchedules],
  );

  const activeSchedules = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.map((r) => r.schedule);
    }
    const filtered = showConflicting
      ? generatedSchedules
      : generatedSchedules.filter((s) => s.conflicts.length === 0);
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [searchResults, generatedSchedules, showConflicting]);

  const groupedSchedules = useMemo(() => {
    if (activeSchedules.length === 0) return [];
    const schedulesToGroup =
      searchResults.length > 0 ? searchResults.map((r) => r.schedule) : activeSchedules;
    return groupSchedulesByStructure(schedulesToGroup);
  }, [activeSchedules, searchResults]);

  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const hasActiveFilters = !!searchQuery.trim();

  const showDiagnostics =
    activeSchedules.length === 0 && generatedSchedules.length === 0 && diagnostics?.hasIssues;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: { xs: '95vh', sm: '90vh', md: '85vh' },
            borderRadius: 4,
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
              }}
            >
              <GridView sx={{ color: 'secondary.main' }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                Schedule Explorer
              </Typography>
              {!showDiagnostics && (
                <Chip
                  label={`${activeSchedules.length}`}
                  size="small"
                  color={activeSchedules.length > 0 ? 'success' : 'default'}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                />
              )}
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
              }}
            >
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

          {!showDiagnostics && (
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'center',
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {hasActiveFilters && (
                          <IconButton
                            size="small"
                            onClick={handleClearSearch}
                            edge="end"
                            sx={{ mr: 0.5, borderRadius: 2 }}
                            title="Clear search"
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        )}
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.1) },
                  },
                }}
              />
            </Stack>
          )}

          {hasActiveFilters && searchResults.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
            </Typography>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {showDiagnostics ? (
          <ScheduleDiagnosticsPanel
            diagnostics={diagnostics}
            onSuggestionClick={(s) => onDiagnosticAction?.(s)}
          />
        ) : activeSchedules.length === 0 ? (
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
                sx={{
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  '& .MuiTab-root': { borderRadius: 2, textTransform: 'none', fontWeight: 600 },
                }}
              >
                <Tab label={`All (${activeSchedules.length})`} />
                {groupedSchedules.length > 0 && (
                  <Tab label={`Grouped (${groupedSchedules.length})`} />
                )}
              </Tabs>

              <ScheduleList
                explorerTab={explorerTab}
                searchResults={searchResults}
                activeSchedules={activeSchedules}
                groupedSchedules={groupedSchedules}
                selectedSchedule={selectedSchedule}
                onSelectSchedule={onSelectSchedule}
                courses={courses}
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

interface ScheduleListProps {
  explorerTab: number;
  searchResults: SearchResult[];
  activeSchedules: GeneratedSchedule[];
  groupedSchedules: ReturnType<typeof groupSchedulesByStructure>;
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
  courses: Course[];
}

const ScheduleList = memo(function ScheduleList({
  explorerTab,
  searchResults,
  activeSchedules,
  groupedSchedules,
  selectedSchedule,
  onSelectSchedule,
  courses,
}: ScheduleListProps) {
  if (explorerTab === 0) {
    const displayList = searchResults.length > 0 ? searchResults : activeSchedules;

    return (
      <Stack spacing={1} sx={{ p: 2 }}>
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
              courses={courses}
            />
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {groupedSchedules.map((group, gIdx) => (
        <GroupSection
          key={gIdx}
          group={group}
          selectedSchedule={selectedSchedule}
          onSelectSchedule={onSelectSchedule}
        />
      ))}
    </Stack>
  );
});

interface ScheduleListItemProps {
  schedule: GeneratedSchedule;
  idx: number;
  isSelected: boolean;
  isSearchResult: boolean;
  relevanceScore?: number;
  explanation?: string;
  onSelect: () => void;
  courses: Course[];
}

const ScheduleListItem = memo(function ScheduleListItem({
  schedule,
  idx,
  isSelected,
  isSearchResult,
  relevanceScore,
  explanation,
  onSelect,
  courses,
}: ScheduleListItemProps) {
  const courseCodeList = useMemo(() => {
    const courseMap = new Map(courses.map((c) => [c.id, c.code]));
    return schedule.sections.map((s) => courseMap.get(s.courseId) || s.courseId).join(', ');
  }, [schedule, courses]);

  return (
    <Card
      variant="outlined"
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
        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {idx === 0 && !isSearchResult && (
                <Star sx={{ color: 'warning.main', fontSize: 16 }} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {courseCodeList}
          </Typography>
          {explanation && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
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
      </CardContent>
    </Card>
  );
});

interface GroupSectionProps {
  group: { id: string; label: string; schedules: GeneratedSchedule[] };
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
}

const GroupSection = memo(function GroupSection({
  group,
  selectedSchedule,
  onSelectSchedule,
}: GroupSectionProps) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          mb: 1,
        }}
      >
        {group.label} ({group.schedules.length})
      </Typography>
      <Stack spacing={1}>
        {group.schedules.slice(0, MAX_DISPLAY_SCHEDULES).map((genSched) => (
          <Card
            key={genSched.id}
            variant="outlined"
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
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                  }}
                >
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

interface ScheduleDetailsProps {
  selectedSchedule: GeneratedSchedule;
  courses: Course[];
  onApply: () => void;
}

function ScheduleDetails({ selectedSchedule, courses, onApply }: ScheduleDetailsProps) {
  const theme = useTheme();

  return (
    <Stack
      sx={{
        p: 3,
        height: '100%',
        position: 'relative',
      }}
    >
      <Box sx={{ overflow: 'auto', pb: 7 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
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
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: 'warning.main',
                mb: 1,
              }}
            >
              ⚠️ Conflicts:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {selectedSchedule.conflicts.map((c: string, i: number) => (
                <li key={i}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'warning.main',
                    }}
                  >
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
          bgcolor: 'background.paper',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <Button
          variant="contained"
          color="secondary"
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
