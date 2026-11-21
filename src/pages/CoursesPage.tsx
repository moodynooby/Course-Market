import { CalendarToday, Clear, KeyboardArrowDown, Search } from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import { CourseCard } from '../components/CourseCard';
import { EmptyState } from '../components/EmptyState';
import { useCourseSelection } from '../context/CourseSelectionContext';
import { useToast } from '../context/ToastContext';
import { useProfessorsMap } from '../hooks/useProfessorsMap';
import { searchCourses } from '../services/search';
import type { Course, Section } from '../types';
import { hasOpenSeats, hasSectionConflict } from '../utils/schedule';

const SEARCH_DEBOUNCE_MS = 150;

export default function CoursesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { toast } = useToast();
  const {
    semesterId: currentSemesterId,
    semesterName: currentSemesterName,
    availableSemesters,
    courses,
    sections,
    loading,
    error,
    selectedSections,
    pinnedSections,
    selectSection,
    togglePin,
    clearAllSelections,
    switchSemester,
    refreshCatalog,
  } = useCourseSelection();

  const [errorDismissed, setErrorDismissed] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [hideConflicts, setHideConflicts] = useState(false);
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [semesterMenuAnchor, setSemesterMenuAnchor] = useState<null | HTMLElement>(null);

  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const professorRatings = useProfessorsMap();
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const [searchParams] = useSearchParams();
  const deepLinkCode = searchParams.get('courseCode') ?? searchParams.get('code');
  useEffect(() => {
    if (deepLinkCode) {
      setSearch(deepLinkCode);
    }
  }, [deepLinkCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const subjects = useMemo(() => {
    const subs = new Set(courses.map((c) => c.subject));
    return Array.from(subs).sort();
  }, [courses]);

  const coursesMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const courseSectionsMap = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const section of sections) {
      let existing = map.get(section.courseId);
      if (!existing) {
        existing = [];
        map.set(section.courseId, existing);
      }
      existing.push(section);
    }
    return map;
  }, [sections]);

  const selectedCourseInfo = useMemo(() => {
    let totalCredits = 0;
    const items: Array<{ course: Course; section: Section }> = [];
    selectedSections.forEach((sectionId, courseId) => {
      const course = coursesMap.get(courseId);
      const section = sectionsMap.get(sectionId);
      if (course && section) {
        items.push({ course, section });
        totalCredits += course.credits;
      }
    });
    return { items, totalCredits };
  }, [selectedSections, coursesMap, sectionsMap]);

  const selectedSectionList = useMemo(() => {
    const ids = new Set(selectedSections.values());
    return sections.filter((section) => ids.has(section.id));
  }, [selectedSections, sections]);

  const conflictDetails = useMemo(() => {
    const details = new Map<string, string>();
    const selected = selectedSectionList;
    if (selected.length === 0) return details;
    for (const section of sections) {
      for (const sel of selected) {
        if (sel.courseId !== section.courseId && hasSectionConflict(section, sel)) {
          const conflictingCourse = coursesMap.get(sel.courseId);
          const code = conflictingCourse ? conflictingCourse.code : 'Selected course';
          details.set(section.id, `${code} Sec ${sel.sectionNumber}`);
          break;
        }
      }
    }
    return details;
  }, [sections, selectedSectionList, coursesMap]);

  const conflictIds = useMemo(() => new Set(conflictDetails.keys()), [conflictDetails]);

  const filteredCourses = useMemo(() => {
    let result = courses;

    if (debouncedSearch.trim()) {
      result = searchCourses(courses, sections, debouncedSearch);
    }

    if (subject !== 'all') {
      result = result.filter((c) => c.subject === subject);
    }

    if (showSelectedOnly) {
      result = result.filter((course) => selectedSections.has(course.id));
    }

    if (openSeatsOnly) {
      result = result.filter((course) => {
        const courseSecs = courseSectionsMap.get(course.id) || [];
        return courseSecs.some(hasOpenSeats);
      });
    }

    if (hideConflicts && selectedSections.size > 0) {
      result = result.filter((course) => {
        if (selectedSections.has(course.id)) return true;
        const courseSecs = courseSectionsMap.get(course.id) || [];
        return courseSecs.some((s) => !conflictIds.has(s.id));
      });
    }

    if (
      !showSelectedOnly &&
      (debouncedSearch.trim() || subject !== 'all' || openSeatsOnly || hideConflicts)
    ) {
      const selected: Course[] = [];
      const unselected: Course[] = [];
      for (const course of result) {
        if (selectedSections.has(course.id)) selected.push(course);
        else unselected.push(course);
      }
      result = [...selected, ...unselected];
    }

    return result;
  }, [
    courses,
    sections,
    debouncedSearch,
    subject,
    selectedSections,
    showSelectedOnly,
    openSeatsOnly,
    hideConflicts,
    courseSectionsMap,
    conflictIds,
  ]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    subject !== 'all' ||
    showSelectedOnly ||
    hideConflicts ||
    openSeatsOnly;

  const handleResetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setSubject('all');
    setShowSelectedOnly(false);
    setHideConflicts(false);
    setOpenSeatsOnly(false);
  }, []);

  const handleSelectSection = useCallback(
    (courseId: string, sectionId: string) => {
      const isSelected = selectedSections.get(courseId) === sectionId;
      selectSection(courseId, sectionId);
      if (isSelected) {
        toast.info('Deselected course');
      } else {
        toast.success('Selected course');
      }
    },
    [selectedSections, selectSection, toast],
  );

  const handleTogglePin = useCallback(
    (courseId: string, sectionId: string) => {
      togglePin(courseId, sectionId);
    },
    [togglePin],
  );

  const handleClearAll = useCallback(() => {
    setClearConfirmOpen(true);
  }, []);

  const handleClearConfirmed = useCallback(() => {
    clearAllSelections();
    setClearConfirmOpen(false);
    toast.info('Cleared all course selections');
  }, [clearAllSelections, toast]);

  const handleExpand = useCallback((courseId: string) => {
    setExpanded((prev) => (prev === courseId ? null : courseId));
  }, []);

  const handleSemesterMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setSemesterMenuAnchor(event.currentTarget);
  }, []);

  const handleSemesterMenuClose = useCallback(() => {
    setSemesterMenuAnchor(null);
  }, []);

  const handleSemesterChange = useCallback(
    async (semesterId: string, semesterName: string) => {
      setSemesterMenuAnchor(null);
      await switchSemester(semesterId, semesterName);
    },
    [switchSemester],
  );

  if (loading) {
    return (
      <Box role="status" aria-live="polite" aria-busy="true">
        <Box component="header" sx={{ mb: 5 }}>
          <Typography variant="h4" gutterBottom>
            Course Browser
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Loading {currentSemesterName ? `${currentSemesterName} courses...` : 'courses...'}
          </Typography>
        </Box>
        <Stack spacing={2}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Skeleton variant="text" width="30%" height={30} />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="rectangular" height={60} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  if (courses.length === 0) {
    return (
      <Box>
        <Box component="header" sx={{ mb: 5 }}>
          <Typography variant="h4" gutterBottom>
            Course Browser
          </Typography>
        </Box>
        {error ? (
          <Stack spacing={2}>
            <Alert severity="error" action={<Button onClick={refreshCatalog}>Retry</Button>}>
              {error}
            </Alert>
          </Stack>
        ) : (
          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                }}
              >
                <CalendarToday sx={{ fontSize: 40, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="h6">No Courses Loaded</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Try switching semesters or check back later.
                  </Typography>
                </Box>
              </Stack>
              <Button variant="contained" sx={{ mt: 3 }} onClick={refreshCatalog}>
                Load Courses
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box component="header" sx={{ mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
              Course Browser
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
              }}
            >
              Search courses, view sections, and select your preferred classes.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            aria-haspopup="menu"
            onClick={handleSemesterMenuOpen}
            disabled={availableSemesters.length === 0}
            startIcon={<CalendarToday />}
            endIcon={<KeyboardArrowDown />}
            sx={{ minWidth: { xs: '100%', sm: 200 }, maxWidth: { sm: 280 } }}
          >
            {availableSemesters.length === 0
              ? 'Loading...'
              : (currentSemesterName || 'Select Semester').length > 30
                ? `${(currentSemesterName || 'Select Semester').slice(0, 27)}…`
                : currentSemesterName || 'Select Semester'}
          </Button>
        </Stack>
      </Box>
      <Menu
        anchorEl={semesterMenuAnchor}
        open={Boolean(semesterMenuAnchor)}
        onClose={handleSemesterMenuClose}
      >
        {availableSemesters.length === 0 ? (
          <MenuItem disabled>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              Loading semesters...
            </Typography>
          </MenuItem>
        ) : (
          availableSemesters.map((semester) => (
            <MenuItem
              key={semester.id}
              onClick={() => handleSemesterChange(semester.id, semester.name)}
              selected={currentSemesterId === semester.id}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                }}
              >
                <CalendarToday
                  fontSize="small"
                  color={currentSemesterId === semester.id ? 'action' : 'disabled'}
                />
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {semester.name}
                  </Typography>
                  {currentSemesterId === semester.id && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      Current
                    </Typography>
                  )}
                </Box>
              </Stack>
            </MenuItem>
          ))
        )}
      </Menu>
      {!errorDismissed && error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setErrorDismissed(true)}>
          {error}
        </Alert>
      )}
      {selectedCourseInfo.items.length > 0 && (
        <Card
          variant="outlined"
          role="status"
          aria-live="polite"
          sx={{
            mb: 2.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.success.main, 0.05),
            borderColor: alpha(theme.palette.success.main, 0.3),
          }}
        >
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {selectedCourseInfo.items.length} course
                  {selectedCourseInfo.items.length > 1 ? 's' : ''} selected
                </Typography>
                <Chip
                  label={`${selectedCourseInfo.totalCredits} credits`}
                  size="small"
                  color="success"
                  sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  (Target: 12-18 credits)
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}
              >
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/')}
                  sx={{ borderRadius: 2, flex: { xs: 1, sm: 'initial' }, fontWeight: 600 }}
                >
                  Generate Schedules
                </Button>
                <Button
                  size="small"
                  variant={showSelectedOnly ? 'contained' : 'outlined'}
                  onClick={() => setShowSelectedOnly((v) => !v)}
                  sx={{ borderRadius: 2 }}
                >
                  {showSelectedOnly ? 'Show All' : 'View Selected'}
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={handleClearAll}
                  sx={{ borderRadius: 2 }}
                >
                  Clear All
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
        <TextField
          label="Search courses"
          placeholder="Search by course code, title, or instructor"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  {search && (
                    <Tooltip title="Clear search">
                      <IconButton
                        size="small"
                        onClick={() => setSearch('')}
                        sx={{ mr: 0.5 }}
                        aria-label="Clear search"
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
          <InputLabel>Subject</InputLabel>
          <Select value={subject} label="Subject" onChange={(e) => setSubject(e.target.value)}>
            <MenuItem value="all">All Subjects</MenuItem>
            {subjects.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: 2.5,
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Chip
          label={`Selected (${selectedCourseInfo.items.length})`}
          clickable
          color={showSelectedOnly ? 'primary' : 'default'}
          variant={showSelectedOnly ? 'filled' : 'outlined'}
          onClick={() => setShowSelectedOnly((v) => !v)}
          disabled={selectedCourseInfo.items.length === 0}
          size="small"
        />
        <Chip
          label="Open Seats Only"
          clickable
          color={openSeatsOnly ? 'primary' : 'default'}
          variant={openSeatsOnly ? 'filled' : 'outlined'}
          onClick={() => setOpenSeatsOnly((v) => !v)}
          size="small"
        />
        <Chip
          label="No Conflicts"
          clickable
          color={hideConflicts ? 'primary' : 'default'}
          variant={hideConflicts ? 'filled' : 'outlined'}
          onClick={() => setHideConflicts((v) => !v)}
          disabled={selectedCourseInfo.items.length === 0}
          size="small"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Showing {filteredCourses.length} of {courses.length} courses
        </Typography>
        {hasActiveFilters && (
          <Button
            size="small"
            onClick={handleResetFilters}
            sx={{ fontSize: '0.75rem', py: 0.2, px: 0.8, minWidth: 'auto', textTransform: 'none' }}
          >
            Reset Filters
          </Button>
        )}
      </Stack>

      {filteredCourses.length === 0 && (
        <EmptyState
          icon={<Search />}
          title="No courses found"
          description="No courses found matching your criteria. Try adjusting your search or filters."
        />
      )}

      <Virtuoso
        data={filteredCourses}
        overscan={3}
        itemContent={(_index, course) => {
          const sectionList = courseSectionsMap.get(course.id) || [];
          return (
            <Box sx={{ pb: 1 }}>
              <CourseCard
                course={course}
                sections={sectionList}
                selectedSectionId={selectedSections.get(course.id)}
                pinnedSectionId={pinnedSections.get(course.id)}
                isExpanded={expanded === course.id}
                conflictIds={conflictIds}
                conflictDetails={conflictDetails}
                onExpand={() => handleExpand(course.id)}
                onSelectSection={(sectionId) => handleSelectSection(course.id, sectionId)}
                onTogglePin={(sectionId) => handleTogglePin(course.id, sectionId)}
                professorRatings={professorRatings}
              />
            </Box>
          );
        }}
        style={{
          height: 'calc(100vh - 340px)',
          minHeight: '400px',
          paddingBottom: selectedCourseInfo.items.length > 0 ? 80 : 0,
        }}
      />

      {selectedCourseInfo.items.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 68, md: 24 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
            width: { xs: 'calc(100% - 32px)', sm: 'auto' },
            minWidth: { sm: 460 },
            maxWidth: 680,
            bgcolor: 'background.paper',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '1px solid',
            borderColor: alpha(theme.palette.divider, 0.8),
            backdropFilter: 'blur(8px)',
            borderRadius: 4,
            p: { xs: 1.25, sm: 1.5 },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0, pl: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {selectedCourseInfo.items.length} Selected • {selectedCourseInfo.totalCredits}{' '}
                Credits
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Ready to build timetable
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowSelectedOnly((v) => !v)}
                sx={{ borderRadius: 2, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {showSelectedOnly ? 'Show All' : 'View Selected'}
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => navigate('/')}
                sx={{ borderRadius: 2, fontWeight: 600, px: 2 }}
              >
                Generate Schedules
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)}>
        <DialogTitle>Clear all selections?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove all {selectedCourseInfo.items.length} selected course
            {selectedCourseInfo.items.length !== 1 ? 's' : ''}. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleClearConfirmed}>
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
