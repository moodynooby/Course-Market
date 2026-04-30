import { CalendarToday, Clear, KeyboardArrowDown } from '@mui/icons-material';
import {
  Alert,
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
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CourseCard } from '../components/CourseCard';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { useSemesterParser } from '../hooks/useSemesterParser';
import { getSemesters } from '../services/coursesApi';
import { cacheSemesterData, getCachedSemesterData } from '../services/dbCache';
import { api } from '../services/apiClient';
import { searchIndex } from '../services/searchIndex';
import type { Course, Section } from '../types';
import { hasSectionConflict } from '../utils/schedule';

const SEARCH_DEBOUNCE_MS = 150;
const SAVE_DEBOUNCE_MS = 500;
const INITIAL_ESTIMATE_SIZE = 200;

export default function CoursesPage() {
  const { isAuthenticated, getToken } = useAuth();
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

  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(() => {
    const saved = storage.get<Record<string, string>>(STORAGE_KEYS.COURSE_SELECTIONS, {});
    return new Map(Object.entries(saved));
  });

  const previousSelectionsRef = useRef<Map<string, string>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveSelections = useCallback((selections: Map<string, string>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const saved = Object.fromEntries(selections);
      storage.set(STORAGE_KEYS.COURSE_SELECTIONS, saved);
      console.log(
        `[CoursesPage] Saved ${selections.size} course selection(s) to localStorage`,
        saved,
      );
      window.dispatchEvent(new Event('storage'));
    }, SAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
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
    saveSelections(selectedSections);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedSections, saveSelections]);

  const loadCoursesFromSemester = useCallback(
    async (jsonUrl: string, semesterName: string) => {
      try {
        setLoadingMessage(`Loading ${semesterName} courses...`);
        fetchAndParse(jsonUrl, semesterName, semesterName);
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
      const semesterId = parsedResult.semesterId.toLowerCase();

      cacheSemesterData(
        semesterId,
        parsedResult.courses,
        parsedResult.sections,
        parsedResult.version,
      );
      searchIndex.buildIndex(parsedResult.courses, parsedResult.sections);

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
      const token = await getToken();
      const result = await api.get<{ profile?: { semesterId?: string } }>('/user-profile', token);
      const profile = result.profile;

      let selectedSemester: { id: string; name: string; jsonUrl: string } | null = null;

      if (profile?.semesterId) {
        const { semesters } = await getSemesters();
        const normalizedId = profile.semesterId.toLowerCase();
        selectedSemester = semesters.find((s) => s.id === normalizedId) || null;
      }

      if (!selectedSemester) {
        const { semesters } = await getSemesters();
        if (semesters.length > 0) {
          selectedSemester = semesters[0];
        }
      }

      // Try cache first before fetching
      if (selectedSemester?.id) {
        setCurrentSemesterId(selectedSemester.id);
        setCurrentSemesterName(selectedSemester.name);

        const cachedData = await getCachedSemesterData(selectedSemester.id);
        if (cachedData && cachedData.courses.length > 0) {
          setCourses(cachedData.courses);
          setSections(cachedData.sections);
          searchIndex.buildIndex(cachedData.courses, cachedData.sections);
          setLoading(false);
          console.log('[CoursesPage] Loaded from IndexedDB cache for', selectedSemester.id);
          return;
        }
      }

      if (selectedSemester?.jsonUrl) {
        await loadCoursesFromSemester(selectedSemester.jsonUrl, selectedSemester.name);
      } else {
        setError('No semester data available. Please complete onboarding first.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[CoursesPage] Error auto-loading courses:', err);
      setError('Failed to load courses. Please try again later.');
      setLoading(false);
    }
  }, [isAuthenticated, getToken, loadCoursesFromSemester]);

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
    if (!debouncedSearch.trim()) {
      return subject === 'all' ? courses : courses.filter((c) => c.subject === subject);
    }

    const { courseIds } = searchIndex.search(debouncedSearch);

    if (courseIds.length === 0) {
      const loweredSearch = debouncedSearch.toLowerCase();
      return courses.filter((course) => {
        const matchesSearch =
          course.name.toLowerCase().includes(loweredSearch) ||
          course.code.toLowerCase().includes(loweredSearch);
        const matchesSubject = subject === 'all' || course.subject === subject;
        return matchesSearch && matchesSubject;
      });
    }

    const courseSet = new Set(courseIds.map((id) => String(id)));
    return courses.filter(
      (course) => courseSet.has(course.id) && (subject === 'all' || course.subject === subject),
    );
  }, [courses, debouncedSearch, subject]);

  const courseSectionsMap = useMemo(() => {
    const map = new Map<string, Section[]>();
    sections.forEach((section) => {
      const existing = map.get(section.courseId) || [];
      existing.push(section);
      map.set(section.courseId, existing);
    });
    return map;
  }, [sections]);

  const selectedSectionList = useMemo(() => {
    const ids = new Set(selectedSections.values());
    return sections.filter((section) => ids.has(section.id));
  }, [selectedSections, sections]);

  const hasConflict = useCallback(
    (section: Section): boolean => {
      return selectedSectionList.some(
        (sel) => sel.id !== section.id && hasSectionConflict(section, sel),
      );
    },
    [selectedSectionList],
  );

  const handleSelectSection = useCallback((courseId: string, sectionId: string) => {
    setSelectedSections((prev) => {
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

      setLoading(true);
      setLoadingMessage(`Loading ${semesterName} courses...`);
      setCurrentSemesterId(semesterId);
      setCurrentSemesterName(semesterName);

      try {
        const cachedData = await getCachedSemesterData(semesterId);
        if (cachedData && cachedData.courses.length > 0) {
          setCourses(cachedData.courses);
          setSections(cachedData.sections);
          searchIndex.buildIndex(cachedData.courses, cachedData.sections);
          setLoading(false);
          console.log('[CoursesPage] Switched to semester from IndexedDB cache:', semesterId);
          return;
        }

        fetchAndParse(jsonUrl, semesterName, semesterName);
      } catch (err) {
        console.error('Error switching semester:', err);
        setError('Failed to load semester courses. Please try again.');
        setLoading(false);
      }
    },
    [currentSemesterId, fetchAndParse],
  );

  // Virtualizer with dynamic measurement
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredCourses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => INITIAL_ESTIMATE_SIZE,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 3,
    gap: 8,
  });

  if (loading) {
    return (
      <Box>
        <Box component="header" sx={{ mb: 5 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
            Course Browser
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
            }}
          >
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
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
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
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}
          >
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    Click below to load courses for the current semester.
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
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
              }}
            >
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
                    <IconButton size="small" onClick={() => setSearch('')} sx={{ mr: 0.5 }}>
                      <Clear fontSize="small" />
                    </IconButton>
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
        {selectedSections.size > 0 && (
          <Button variant="outlined" color="error" onClick={handleClearAll} size="small">
            Clear ({selectedSections.size})
          </Button>
        )}
      </Stack>
      {filteredCourses.length === 0 && (
        <Alert severity="info">No courses found matching your criteria.</Alert>
      )}
      {/* Virtualized course list */}
      <Box
        ref={parentRef}
        sx={{
          height: 'calc(100vh - 280px)',
          minHeight: '400px',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const course = filteredCourses[virtualRow.index];
            const sectionList = courseSectionsMap.get(course.id) || [];
            const selectedSectionId = selectedSections.get(course.id);
            const isExpanded = expanded === course.id;

            return (
              <Box
                key={course.id}
                data-index={virtualRow.index}
                ref={(el: HTMLDivElement | null) => virtualizer.measureElement(el)}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <CourseCard
                  course={course}
                  sections={sectionList}
                  selectedSectionId={selectedSectionId}
                  isExpanded={isExpanded}
                  hasConflict={hasConflict}
                  onExpand={() => handleExpand(course.id)}
                  onSelectSection={(sectionId) => handleSelectSection(course.id, sectionId)}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
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
