import { CalendarToday, Clear, KeyboardArrowDown, Search } from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { CourseCard } from '../components/CourseCard';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { useSemesterParser } from '../hooks/useSemesterParser';
import { getSemesters } from '../services/coursesApi';
import { cacheSemesterData, getCachedSemesterData } from '../services/dbCache';
import { buildCourseIndex, searchCourses } from '../services/search';
import type { Course, Section } from '../types';
import { hasSectionConflict } from '../utils/schedule';

const SEARCH_DEBOUNCE_MS = 150;
const SAVE_DEBOUNCE_MS = 2000;
export default function CoursesPage() {
  const { isAuthenticated, profile, updateProfile } = useAuthContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading courses...');
  const [error, setError] = useState<string | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>('');
  const [currentSemesterName, setCurrentSemesterName] = useState<string>('');
  const [semesterMenuAnchor, setSemesterMenuAnchor] = useState<null | HTMLElement>(null);
  const [availableSemesters, setAvailableSemesters] = useState<
    Array<{ id: string; name: string; jsonUrl: string; isActive: boolean }>
  >([]);
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { progress, result: parsedResult, error: parseError, fetchAndParse } = useSemesterParser();

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
        updateProfile({ courseSelections: saved, pinnedSelections: savedPins }).catch(
          console.error,
        );
      }, SAVE_DEBOUNCE_MS);
    },
    [updateProfile],
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
      setSnackbar({
        open: true,
        message: `Selected ${added.length} course${added.length > 1 ? 's' : ''}`,
        severity: 'success',
      });
    } else if (removed.length > 0) {
      setSnackbar({
        open: true,
        message: `Deselected ${removed.length} course${removed.length > 1 ? 's' : ''}`,
        severity: 'info',
      });
    }

    previousSelectionsRef.current = new Map(curr);
  }, [selectedSections]);

  useEffect(() => {
    if (!initialSyncDoneRef.current) return;

    saveSelections(selectedSections, pinnedSections);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedSections, pinnedSections, saveSelections]);

  const loadCoursesFromSemester = useCallback(
    async (jsonUrl: string, semesterId: string, semesterName: string) => {
      try {
        setLoadingMessage(`Loading ${semesterName} courses...`);
        fetchAndParse(jsonUrl, semesterId, semesterName);
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load courses. Please try again.');
        setLoading(false);
      }
    },
    [fetchAndParse],
  );

  useEffect(() => {
    if (parsedResult) {
      const semesterId = parsedResult.semesterId;

      cacheSemesterData(semesterId, parsedResult.courses, parsedResult.sections);
      buildCourseIndex(parsedResult.courses, parsedResult.sections);

      setCourses(parsedResult.courses);
      setSections(parsedResult.sections);
      setError(null);
      setLoading(false);

      console.log(
        `[Performance] Parsed ${parsedResult.courses.length} courses, ${parsedResult.sections.length} sections in ${parsedResult.parseTime.toFixed(2)}ms`,
      );
    }
  }, [parsedResult]);

  useEffect(() => {
    if (parseError) {
      console.error('Parse error:', parseError);
      setError(`Failed to parse course data: ${parseError.message}`);
      setLoading(false);
    }
  }, [parseError]);

  useEffect(() => {
    if (progress) {
      setLoadingMessage(`${progress.message} (${progress.progress}%)`);
    }
  }, [progress]);

  const autoLoadCourses = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoadingMessage('Checking your profile...');

      let selectedSemester: { id: string; name: string; jsonUrl: string } | null = null;

      if (profile?.semesterId) {
        const { semesters } = await getSemesters();
        selectedSemester = semesters.find((s) => s.id === profile.semesterId) || null;
      }

      if (!selectedSemester) {
        const { semesters } = await getSemesters();
        if (semesters.length > 0) {
          selectedSemester = semesters[0];
        }
      }

      if (selectedSemester?.id) {
        setCurrentSemesterId(selectedSemester.id);
        setCurrentSemesterName(selectedSemester.name);

        const cachedData = await getCachedSemesterData(selectedSemester.id);
        if (cachedData && cachedData.courses.length > 0) {
          setCourses(cachedData.courses);
          setSections(cachedData.sections);
          buildCourseIndex(cachedData.courses, cachedData.sections);
          setLoading(false);
          console.log('[CoursesPage] Loaded from IndexedDB cache for', selectedSemester.id);
          return;
        }
      }

      if (selectedSemester?.jsonUrl) {
        await loadCoursesFromSemester(
          selectedSemester.jsonUrl,
          selectedSemester.id,
          selectedSemester.name,
        );
      } else {
        setError('No semester data available. Please complete onboarding first.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[CoursesPage] Error auto-loading courses:', err);
      setError('Failed to load courses. Please try again later.');
      setLoading(false);
    }
  }, [isAuthenticated, profile?.semesterId, loadCoursesFromSemester]);

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

  const filteredCourses = useMemo(() => {
    let result = courses;

    if (debouncedSearch.trim()) {
      const courseIds = searchCourses(debouncedSearch);
      const courseSet = new Set(courseIds.map((id) => String(id)));
      result = courses.filter((course) => courseSet.has(course.id));
    }

    if (subject !== 'all') {
      result = result.filter((c) => c.subject === subject);
    }

    if (showSelectedOnly) {
      result = result.filter((course) => selectedSections.has(course.id));
    } else if (debouncedSearch.trim() || subject !== 'all') {
      const selected = result.filter((course) => selectedSections.has(course.id));
      const unselected = result.filter((course) => !selectedSections.has(course.id));
      result = [...selected, ...unselected];
    }

    return result;
  }, [courses, debouncedSearch, subject, selectedSections, showSelectedOnly]);

  const courseSectionsMap = useMemo(() => {
    const map = new Map<string, Section[]>();
    sections.forEach((section) => {
      const existing = map.get(section.courseId) || [];
      existing.push(section);
      map.set(section.courseId, existing);
    });
    return map;
  }, [sections]);

  const selectedCourseInfo = useMemo(() => {
    let totalCredits = 0;
    const items: Array<{ course: Course; section: Section }> = [];
    selectedSections.forEach((sectionId, courseId) => {
      const course = courses.find((c) => c.id === courseId);
      const section = sections.find((s) => s.id === sectionId);
      if (course && section) {
        items.push({ course, section });
        totalCredits += course.credits;
      }
    });
    return { items, totalCredits };
  }, [selectedSections, courses, sections]);

  const selectedSectionList = useMemo(() => {
    const ids = new Set(selectedSections.values());
    return sections.filter((section) => ids.has(section.id));
  }, [selectedSections, sections]);

  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    const selected = selectedSectionList;
    sections.forEach((section) => {
      for (const sel of selected) {
        if (sel.id !== section.id && hasSectionConflict(section, sel)) {
          set.add(section.id);
          break;
        }
      }
    });
    return set;
  }, [sections, selectedSectionList]);

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
    setSelectedSections(new Map());
    setPinnedSections(new Map());
    setSnackbar({
      open: true,
      message: 'Cleared all course selections',
      severity: 'info',
    });
  }, []);

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
    async (semesterId: string, jsonUrl: string, semesterName: string) => {
      setSemesterMenuAnchor(null);
      if (semesterId === currentSemesterId) return;

      setSelectedSections(new Map());
      setPinnedSections(new Map());
      setLoading(true);
      setLoadingMessage(`Loading ${semesterName} courses...`);
      setCurrentSemesterId(semesterId);
      setCurrentSemesterName(semesterName);

      try {
        const cachedData = await getCachedSemesterData(semesterId);
        if (cachedData && cachedData.courses.length > 0) {
          setCourses(cachedData.courses);
          setSections(cachedData.sections);
          buildCourseIndex(cachedData.courses, cachedData.sections);
          setLoading(false);
          console.log('[CoursesPage] Switched to semester from IndexedDB cache:', semesterId);
          return;
        }

        fetchAndParse(jsonUrl, semesterId, semesterName);
      } catch (err) {
        console.error('Error switching semester:', err);
        setError('Failed to load semester courses. Please try again.');
        setLoading(false);
      }
    },
    [currentSemesterId, fetchAndParse],
  );

  if (loading) {
    return (
      <Box>
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

  if (!isAuthenticated) {
    return (
      <Box>
        <Box component="header" sx={{ mb: 5 }}>
          <Typography variant="h4" gutterBottom>
            Course Browser
          </Typography>
        </Box>
        <Alert severity="info">Please sign in to view and select courses.</Alert>
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
          direction="row"
          spacing={2}
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="h4" gutterBottom>
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
            onClick={handleSemesterMenuOpen}
            disabled={loadingSemesters}
            startIcon={<CalendarToday />}
            endIcon={<KeyboardArrowDown />}
            sx={{ minWidth: 200 }}
          >
            {loadingSemesters ? 'Loading...' : currentSemesterName || 'Select Semester'}
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
              onClick={() => handleSemesterChange(semester.id, semester.jsonUrl, semester.name)}
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
        <Card variant="outlined" sx={{ mb: 2, bgcolor: alpha('#22c55e', 0.05) }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedCourseInfo.items.length} course
                {selectedCourseInfo.items.length > 1 ? 's' : ''} selected (
                {selectedCourseInfo.totalCredits} credits)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant={showSelectedOnly ? 'contained' : 'outlined'}
                  onClick={() => setShowSelectedOnly((v) => !v)}
                >
                  View Selected
                </Button>
                <Button size="small" color="error" variant="outlined" onClick={handleClearAll}>
                  Clear All
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search courses..."
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
        <FormControl sx={{ minWidth: 200 }} size="small">
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
                onExpand={() => handleExpand(course.id)}
                onSelectSection={(sectionId) => handleSelectSection(course.id, sectionId)}
                onTogglePin={(sectionId) => handleTogglePin(course.id, sectionId)}
              />
            </Box>
          );
        }}
        style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
