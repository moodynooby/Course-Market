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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import { CourseCard } from '../components/CourseCard';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useProfessorsMap } from '../hooks/useProfessorsMap';
import { getSemesterData, getSemesters } from '../services/coursesApi';
import { buildCourseIndex, searchCourses } from '../services/search';
import type { Course, Section } from '../types';
import { hasSectionConflict } from '../utils/schedule';

const SEARCH_DEBOUNCE_MS = 150;
const SAVE_DEBOUNCE_MS = 2000;

export default function CoursesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { profile, updateProfile } = useAuthContext();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [hideConflicts, setHideConflicts] = useState(false);
  const [openSeatsOnly, setOpenSeatsOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading courses...');
  const [error, setError] = useState<string | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>('');
  const [currentSemesterName, setCurrentSemesterName] = useState<string>('');
  const [semesterMenuAnchor, setSemesterMenuAnchor] = useState<null | HTMLElement>(null);
  const [availableSemesters, setAvailableSemesters] = useState<
    Array<{ id: string; name: string; isActive: boolean }>
  >([]);
  const [loadingSemesters, setLoadingSemesters] = useState(false);

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

  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(new Map());
  const [pinnedSections, setPinnedSections] = useState<Map<string, string>>(new Map());

  const initialSyncDoneRef = useRef(false);
  const previousSelectionsRef = useRef<Map<string, string>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile && !initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      if (profile.courseSelections) {
        setSelectedSections(new Map(Object.entries(profile.courseSelections)));
      }
      if (profile.pinnedSelections) {
        setPinnedSections(new Map(Object.entries(profile.pinnedSelections)));
      }
    }
  }, [profile]);

  const saveSelections = useCallback(
    (selections: Map<string, string>, pins: Map<string, string>) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const saved = Object.fromEntries(selections);
        const savedPins = Object.fromEntries(pins);
        updateProfile({ courseSelections: saved, pinnedSelections: savedPins }).catch(() => {
          toast.error('Failed to save course selections. Please try again.');
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [toast, updateProfile],
  );

  useEffect(() => {
    if (!initialSyncDoneRef.current) return;

    const prev = previousSelectionsRef.current;
    const curr = selectedSections;

    const added: string[] = [];
    const removed: string[] = [];

    curr.forEach((sectionId, courseId) => {
      if (!prev.has(courseId) || prev.get(courseId) !== sectionId) {
        added.push(courseId);
      }
    });

    prev.forEach((_, courseId) => {
      if (!curr.has(courseId)) {
        removed.push(courseId);
      }
    });

    if (added.length > 0) {
      toast.success(`Selected ${added.length} course${added.length > 1 ? 's' : ''}`);
    } else if (removed.length > 0) {
      toast.info(`Deselected ${removed.length} course${removed.length > 1 ? 's' : ''}`);
    }

    previousSelectionsRef.current = new Map(curr);
  }, [selectedSections, toast]);

  useEffect(() => {
    if (!initialSyncDoneRef.current) return;

    saveSelections(selectedSections, pinnedSections);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedSections, pinnedSections, saveSelections]);

  const loadCoursesFromSemester = useCallback(async (semesterId: string, semesterName: string) => {
    setLoading(true);
    setLoadingMessage(`Loading ${semesterName} courses...`);
    try {
      const { courses, sections } = await getSemesterData(semesterId);
      buildCourseIndex(courses, sections);
      setCourses(courses);
      setSections(sections);
      setError(null);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const autoLoadCourses = useCallback(async () => {
    try {
      setLoadingMessage('Checking your profile...');

      const { semesters } = await getSemesters();

      let selectedSemester: { id: string; name: string } | null = null;

      if (profile?.semesterId) {
        selectedSemester = semesters.find((s) => s.id === profile.semesterId) || null;
      }

      if (!selectedSemester && semesters.length > 0) {
        selectedSemester = semesters[0];
      }

      if (selectedSemester?.id) {
        setCurrentSemesterId(selectedSemester.id);
        setCurrentSemesterName(selectedSemester.name);
        await loadCoursesFromSemester(selectedSemester.id, selectedSemester.name);
      } else {
        setError('No semester data available. Please complete onboarding first.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[CoursesPage] Error auto-loading courses:', err);
      setError('Failed to load courses. Please try again later.');
      setLoading(false);
    }
  }, [profile?.semesterId, loadCoursesFromSemester]);

  useEffect(() => {
    autoLoadCourses();
  }, [autoLoadCourses]);

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
        if (sel.id !== section.id && hasSectionConflict(section, sel)) {
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
      result = searchCourses(debouncedSearch);
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
        return courseSecs.some((s) => s.capacity === 0 || s.enrolled < s.capacity);
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

  const handleSelectSection = useCallback((courseId: string, sectionId: string) => {
    setSelectedSections((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(courseId) === sectionId) {
        newMap.delete(courseId);
        setPinnedSections((p) => {
          const np = new Map(p);
          np.delete(courseId);
          return np;
        });
      } else {
        newMap.set(courseId, sectionId);
      }
      if (newMap.size !== prev.size) return newMap;
      for (const [key, val] of newMap) {
        if (!prev.has(key) || prev.get(key) !== val) return newMap;
      }
      return prev;
    });
  }, []);

  const handleTogglePin = useCallback((courseId: string, sectionId: string) => {
    setPinnedSections((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(courseId) === sectionId) {
        newMap.delete(courseId);
      } else {
        newMap.set(courseId, sectionId);
      }
      return newMap;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setClearConfirmOpen(true);
  }, []);

  const handleClearConfirmed = useCallback(() => {
    setSelectedSections(new Map());
    setPinnedSections(new Map());
    setClearConfirmOpen(false);
    toast.info('Cleared all course selections');
  }, [toast]);

  const handleExpand = useCallback((courseId: string) => {
    setExpanded((prev) => (prev === courseId ? null : courseId));
  }, []);

  const handleSemesterMenuOpen = useCallback(
    async (event: React.MouseEvent<HTMLElement>) => {
      setSemesterMenuAnchor(event.currentTarget);
      if (availableSemesters.length === 0 && !loadingSemesters) {
        setLoadingSemesters(true);
        try {
          const { semesters } = await getSemesters();
          setAvailableSemesters(semesters);
        } catch (err) {
          console.error('Failed to load semesters:', err);
        } finally {
          setLoadingSemesters(false);
        }
      }
    },
    [availableSemesters, loadingSemesters],
  );

  const handleSemesterMenuClose = useCallback(() => {
    setSemesterMenuAnchor(null);
  }, []);

  const handleSemesterChange = useCallback(
    async (semesterId: string, semesterName: string) => {
      setSemesterMenuAnchor(null);
      if (semesterId === currentSemesterId) return;

      setSelectedSections(new Map());
      setPinnedSections(new Map());
      setCurrentSemesterId(semesterId);
      setCurrentSemesterName(semesterName);
      await loadCoursesFromSemester(semesterId, semesterName);
    },
    [currentSemesterId, loadCoursesFromSemester],
  );

  if (loading) {
    return (
      <Box role="status" aria-live="polite" aria-busy="true">
        <Box component="header" sx={{ mb: 5 }}>
          <Typography variant="h4" gutterBottom>
            Course Browser
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {loadingMessage}
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
            <Alert severity="error" action={<Button onClick={autoLoadCourses}>Retry</Button>}>
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
              <Button variant="contained" sx={{ mt: 3 }} onClick={autoLoadCourses}>
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
            disabled={loadingSemesters}
            startIcon={<CalendarToday />}
            endIcon={<KeyboardArrowDown />}
            sx={{ minWidth: { xs: '100%', sm: 200 }, maxWidth: { sm: 280 } }}
          >
            {loadingSemesters
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
        {loadingSemesters ? (
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
        ) : availableSemesters.length === 0 ? (
          <MenuItem disabled>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              No semesters available
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
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
