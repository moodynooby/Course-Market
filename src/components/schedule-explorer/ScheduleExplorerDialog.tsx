import {
  CalendarToday,
  Close,
  ExpandLess,
  ExpandMore,
  FilterList,
  GridView,
  Search,
  Star,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Course, DayOfWeek, Section } from '../../types';
import { DAY_ORDER } from '../../utils/schedule';
import type { ScheduleDiagnostics } from '../../utils/schedule-diagnostics';
import { clusterSchedulesBySimilarity } from '../../utils/schedule-generator';
import type { GeneratedSchedule, SearchResult } from '../../utils/schedule-types';
import CalendarView from '../CalendarView';
import { EmptyState } from '../EmptyState';
import { ScheduleDiagnosticsPanel } from './ScheduleDiagnosticsPanel';

const MAX_DISPLAY_SCHEDULES = 50;
const SCORE_EXCELLENT = 80;
const SCORE_GOOD = 60;
const MATCH_EXCELLENT = 0.8;
const MATCH_GOOD = 0.6;

interface ScheduleSignature {
  daysLabel: string;
  timeRange: string;
  instructors: string;
}

function formatHour(hour: number): string {
  if (hour <= 0 || hour >= 24) return '';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function getScheduleSignature(schedule: GeneratedSchedule): ScheduleSignature {
  const daySet = new Set<DayOfWeek>();
  let earliest = 24;
  let latest = 0;
  const instructorByCourse = new Map<string, string>();

  for (const section of schedule.sections) {
    for (const slot of section.timeSlots) {
      daySet.add(slot.day);
      const startHour = Number.parseInt(slot.startTime.split(':')[0], 10);
      const endHour = Number.parseInt(slot.endTime.split(':')[0], 10);
      if (startHour < earliest) earliest = startHour;
      if (endHour > latest) latest = endHour;
    }
    if (section.instructor) instructorByCourse.set(section.courseId, section.instructor);
  }

  const days = DAY_ORDER.filter((d) => daySet.has(d));
  const daysLabel = days.length === 0 ? '—' : days.join('/');
  const start = formatHour(earliest);
  const end = formatHour(latest);
  const timeRange = start && end ? `${start}–${end}` : '';

  const lastNames = Array.from(instructorByCourse.values())
    .map((name) => {
      const parts = name.replace(/^Dr\.?\s*/i, '').split(/\s+/);
      return parts[parts.length - 1] || name;
    })
    .filter(Boolean);
  const instructors = lastNames.slice(0, 4).join(', ') + (lastNames.length > 4 ? '…' : '');

  return { daysLabel, timeRange, instructors };
}

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
  allSections?: Section[];
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
  allSections,
}: ScheduleExplorerDialogProps) {
  const theme = useTheme();
  const [explorerTab, setExplorerTab] = useState(0);
  const [showLowQuality, setShowLowQuality] = useState(false);

  useEffect(() => {
    if (open) {
      setExplorerTab(0);
      setShowLowQuality(false);
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

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const similarSectionCounts = useMemo(() => {
    const result = new Map<string, number>();
    if (!allSections || allSections.length === 0) return result;
    const buckets = new Map<string, string[]>(); 
    for (const s of allSections) {
      const timeKey = s.timeSlots
        .map((t) => `${t.day}@${t.startTime}-${t.endTime}`)
        .sort()
        .join('|');
      const key = `${s.courseId}|${timeKey}`;
      const list = buckets.get(key) ?? [];
      list.push(s.id);
      buckets.set(key, list);
    }
    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) result.set(id, ids.length - 1);
    }
    return result;
  }, [allSections]);

  const conflictingSchedules = useMemo(
    () => generatedSchedules.filter((s) => s.conflicts.length > 0),
    [generatedSchedules],
  );

  const lowQualitySchedules = useMemo(
    () => generatedSchedules.filter((s) => s.conflicts.length === 0 && s.score < SCORE_GOOD),
    [generatedSchedules],
  );

  const activeSchedules = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.map((r) => r.schedule);
    }
    const filtered = showConflicting
      ? generatedSchedules
      : generatedSchedules.filter((s) => s.conflicts.length === 0);
    const sorted = [...filtered].sort((a, b) => b.score - a.score);
    if (!showLowQuality) {
      return sorted.filter((s) => s.score >= SCORE_GOOD);
    }
    return sorted;
  }, [searchResults, generatedSchedules, showConflicting, showLowQuality]);

  const groupedSchedules = useMemo(() => {
    if (activeSchedules.length === 0) return [];
    const schedulesToGroup =
      searchResults.length > 0 ? searchResults.map((r) => r.schedule) : activeSchedules;
    return clusterSchedulesBySimilarity(schedulesToGroup);
  }, [activeSchedules, searchResults]);

  const creditsAreConstant = useMemo(() => {
    if (activeSchedules.length < 2) return false;
    const first = activeSchedules[0].totalCredits;
    return activeSchedules.every((s) => s.totalCredits === first);
  }, [activeSchedules]);

  const sharedCredits = activeSchedules[0]?.totalCredits ?? 0;

  const sharedCourseCodes = useMemo(() => {
    if (activeSchedules.length === 0) return '';
    const codes = new Set<string>();
    for (const s of activeSchedules[0].sections) {
      codes.add(courseMap.get(s.courseId)?.code ?? s.courseId);
    }
    return Array.from(codes).join(', ');
  }, [activeSchedules, courseMap]);

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
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <GridView sx={{ color: 'secondary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
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
              {!showDiagnostics && creditsAreConstant && (
                <Chip
                  label={`${sharedCredits} credits`}
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {lowQualitySchedules.length > 0 && !searchResults.length && (
                <Chip
                  label={`${lowQualitySchedules.length} low quality`}
                  size="small"
                  color="warning"
                  variant={showLowQuality ? 'filled' : 'outlined'}
                  onClick={() => setShowLowQuality((v) => !v)}
                  sx={{ cursor: 'pointer', borderRadius: 2 }}
                />
              )}
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

          {!showDiagnostics && sharedCourseCodes && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {sharedCourseCodes}
            </Typography>
          )}

          {!showDiagnostics && (
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
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
                position: 'relative',
              }}
            >
              <Tabs
                value={explorerTab}
                onChange={(_, v) => setExplorerTab(v)}
                variant="fullWidth"
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  bgcolor: 'background.paper',
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
                showCredits={!creditsAreConstant}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }} sx={{ overflow: 'auto' }}>
              {selectedSchedule ? (
                <ScheduleDetails
                  selectedSchedule={selectedSchedule}
                  courses={courses}
                  onApply={() => onApplySchedule(selectedSchedule)}
                  similarSectionCounts={similarSectionCounts}
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
  groupedSchedules: ReturnType<typeof clusterSchedulesBySimilarity>;
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
  showCredits: boolean;
}

const ScheduleList = memo(function ScheduleList({
  explorerTab,
  searchResults,
  activeSchedules,
  groupedSchedules,
  selectedSchedule,
  onSelectSchedule,
  showCredits,
}: ScheduleListProps) {
  const groupRefs = useRef(new Map<string, HTMLDivElement | null>());

  const scrollToGroup = useCallback((id: string) => {
    const el = groupRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
              showCredits={showCredits}
            />
          );
        })}
      </Stack>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          position: 'sticky',
          top: 48,
          zIndex: 2,
          bgcolor: 'background.paper',
          py: 1,
          mb: 1,
          mx: -2,
          px: 2,
          borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
        }}
      >
        <Stack
          direction="row"
          spacing={0.75}
          sx={{
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
          }}
        >
          {groupedSchedules.map((g) => (
            <Chip
              key={g.id}
              label={`${g.label} (${g.schedules.length})`}
              size="small"
              onClick={() => scrollToGroup(g.id)}
              sx={{ borderRadius: 2, fontWeight: 600, flexShrink: 0, cursor: 'pointer' }}
            />
          ))}
        </Stack>
      </Box>
      <Stack spacing={2}>
        {groupedSchedules.map((group, gIdx) => (
          <GroupSection
            key={group.id}
            group={group}
            defaultExpanded={gIdx === 0}
            selectedSchedule={selectedSchedule}
            onSelectSchedule={onSelectSchedule}
            showCredits={showCredits}
            registerRef={(el) => {
              if (el) groupRefs.current.set(group.id, el);
              else groupRefs.current.delete(group.id);
            }}
          />
        ))}
      </Stack>
    </Box>
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
  showCredits: boolean;
}

const ScheduleListItem = memo(function ScheduleListItem({
  schedule,
  idx,
  isSelected,
  isSearchResult,
  relevanceScore,
  explanation,
  onSelect,
  showCredits,
}: ScheduleListItemProps) {
  const sig = useMemo(() => getScheduleSignature(schedule), [schedule]);

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
        <Stack spacing={0.5}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              {idx === 0 && !isSearchResult && (
                <Star sx={{ color: 'warning.main', fontSize: 16, flexShrink: 0 }} />
              )}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {sig.daysLabel}
                {sig.timeRange ? ` · ${sig.timeRange}` : ''}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              {showCredits && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {schedule.totalCredits} cr
                </Typography>
              )}
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
                  sx={{ borderRadius: 2, fontWeight: 600, minWidth: 40 }}
                />
              )}
            </Stack>
          </Stack>
          {sig.instructors && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {sig.instructors}
            </Typography>
          )}
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
  group: {
    id: string;
    label: string;
    description: string;
    schedules: GeneratedSchedule[];
    topScore: number;
  };
  defaultExpanded: boolean;
  selectedSchedule: GeneratedSchedule | null;
  onSelectSchedule: (schedule: GeneratedSchedule) => void;
  showCredits: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
}

const GroupSection = memo(function GroupSection({
  group,
  defaultExpanded,
  selectedSchedule,
  onSelectSchedule,
  showCredits,
  registerRef,
}: GroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box ref={registerRef} sx={{ scrollMarginTop: 96 }}>
      <Stack
        direction="row"
        spacing={1}
        onClick={() => setExpanded((v) => !v)}
        sx={{
          alignItems: 'center',
          cursor: 'pointer',
          py: 0.5,
          borderRadius: 2,
          '&:hover': { bgcolor: 'action.hover' },
          px: 0.5,
        }}
      >
        {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {group.label}
        </Typography>
        <Chip
          label={`best ${group.topScore}`}
          size="small"
          color={
            group.topScore >= SCORE_EXCELLENT
              ? 'success'
              : group.topScore >= SCORE_GOOD
                ? 'warning'
                : 'error'
          }
          sx={{ borderRadius: 2, fontWeight: 600 }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {group.schedules.length}
        </Typography>
      </Stack>
      {group.description && (
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', mb: 1, px: 0.5 }}
        >
          {group.description}
        </Typography>
      )}
      <Collapse in={expanded} unmountOnExit>
        <Grid container spacing={1}>
          {group.schedules.map((genSched) => (
            <Grid key={genSched.id} size={{ xs: 12, sm: 6 }}>
              <GroupedScheduleCard
                schedule={genSched}
                isSelected={selectedSchedule?.id === genSched.id}
                onSelect={() => onSelectSchedule(genSched)}
                showCredits={showCredits}
              />
            </Grid>
          ))}
        </Grid>
      </Collapse>
    </Box>
  );
});

interface GroupedScheduleCardProps {
  schedule: GeneratedSchedule;
  isSelected: boolean;
  onSelect: () => void;
  showCredits: boolean;
}

const GroupedScheduleCard = memo(function GroupedScheduleCard({
  schedule,
  isSelected,
  onSelect,
  showCredits,
}: GroupedScheduleCardProps) {
  const sig = useMemo(() => getScheduleSignature(schedule), [schedule]);

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: 3,
        height: '100%',
      }}
      onClick={onSelect}
    >
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {sig.daysLabel}
            {sig.timeRange ? ` · ${sig.timeRange}` : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {showCredits && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {schedule.totalCredits} cr
              </Typography>
            )}
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
              sx={{ borderRadius: 2, fontWeight: 600 }}
            />
          </Stack>
        </Stack>
        {sig.instructors && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {sig.instructors}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

interface ScheduleDetailsProps {
  selectedSchedule: GeneratedSchedule;
  courses: Course[];
  onApply: () => void;
  similarSectionCounts?: Map<string, number>;
}

function ScheduleDetails({
  selectedSchedule,
  courses,
  onApply,
  similarSectionCounts,
}: ScheduleDetailsProps) {
  const theme = useTheme();

  return (
    <Stack sx={{ p: 3, height: '100%', position: 'relative' }}>
      <Box sx={{ overflow: 'auto', pb: 7 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
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
            similarSectionCounts={similarSectionCounts}
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
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
              ⚠️ Conflicts:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {selectedSchedule.conflicts.map((c: string, i: number) => (
                <li key={i}>
                  <Typography variant="caption" sx={{ color: 'warning.main' }}>
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
