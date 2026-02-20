import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  IconButton,
  Collapse,
  Alert,
  Skeleton,
} from '@mui/material';
import { ExpandMore, ExpandLess, Schedule, Person, Warning } from '@mui/icons-material';
import { getCourses } from '../config/storageConfig';
import { STORAGE_KEYS } from '../config/userConfig';
import type { Course, Section } from '../types';
import { formatTime, hasSectionConflict, formatTimeSlots } from '../utils/schedule';

const INITIAL_VISIBLE_COURSES = 25;
const VISIBLE_COURSE_STEP = 25;

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COURSES);

  useEffect(() => {
    const data = getCourses();
    setCourses(data.courses);
    setSections(data.sections);
    setLoading(false);

    // Load selections from localStorage
    const saved = localStorage.getItem(STORAGE_KEYS.COURSE_SELECTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedSections(new Map(Object.entries(parsed)));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.COURSE_SELECTIONS,
      JSON.stringify(Object.fromEntries(selectedSections)),
    );
  }, [selectedSections]);

  const subjects = useMemo(() => {
    const subs = new Set(courses.map((c) => c.subject));
    return Array.from(subs).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const loweredSearch = search.toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(loweredSearch) ||
        course.code.toLowerCase().includes(loweredSearch);
      const matchesSubject = subject === 'all' || course.subject === subject;
      return matchesSearch && matchesSubject;
    });
  }, [courses, search, subject]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COURSES);
  }, [search, subject]);

  const courseSectionsMap = useMemo(() => {
    const map = new Map<string, Section[]>();
    sections.forEach((section) => {
      const existing = map.get(section.courseId) || [];
      existing.push(section);
      map.set(section.courseId, existing);
    });
    return map;
  }, [sections]);

  const courseSections = useCallback(
    (courseId: string) => courseSectionsMap.get(courseId) || [],
    [courseSectionsMap],
  );

  const sectionsById = useMemo(() => {
    const map = new Map<string, Section>();
    sections.forEach((section) => {
      map.set(section.id, section);
    });
    return map;
  }, [sections]);

  const getSelectedSection = useCallback(
    (courseId: string) => {
      const sectionId = selectedSections.get(courseId);
      return sectionId ? sectionsById.get(sectionId) : undefined;
    },
    [selectedSections, sectionsById],
  );

  const handleSelectSection = (courseId: string, sectionId: string) => {
    const newMap = new Map(selectedSections);
    if (newMap.get(courseId) === sectionId) {
      newMap.delete(courseId);
    } else {
      newMap.set(courseId, sectionId);
    }
    setSelectedSections(newMap);
  };

  const handleDeselectCourse = (courseId: string) => {
    const newMap = new Map(selectedSections);
    newMap.delete(courseId);
    setSelectedSections(newMap);
  };

  const selectedSectionList = useMemo(() => {
    const ids = new Set(selectedSections.values());
    return sections.filter((section) => ids.has(section.id));
  }, [selectedSections, sections]);

  const visibleCourses = useMemo(
    () => filteredCourses.slice(0, visibleCount),
    [filteredCourses, visibleCount],
  );

  const hasMoreCourses = filteredCourses.length > visibleCount;

  const hasConflict = useCallback(
    (section: Section): boolean =>
      selectedSectionList.some((sel) => sel.id !== section.id && hasSectionConflict(section, sel)),
    [selectedSectionList],
  );

  const handleClearAll = () => {
    setSelectedSections(new Map());
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Course Browser
        </Typography>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
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
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Course Browser
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          No courses imported yet. Import a CSV file to get started.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4" fontWeight={700}>
          Course Browser
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          size="small"
        />
        <FormControl sx={{ minWidth: 150 }} size="small">
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

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          icon={<Schedule />}
          label={`${selectedSections.size} selected`}
          color="primary"
          variant="outlined"
        />
        <Button size="small" onClick={handleClearAll} disabled={selectedSections.size === 0}>
          Clear All
        </Button>
      </Stack>

      {visibleCourses.map((course) => {
        const sectionList = courseSections(course.id);
        const selected = getSelectedSection(course.id);
        const isExpanded = expanded === course.id;

        return (
          <Card key={course.id} sx={{ mb: 2 }}>
            <CardContent sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {course.code}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {course.name} • {course.credits} credits
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  {selected && (
                    <Chip
                      size="small"
                      label={`Section ${selected.sectionNumber}`}
                      color="success"
                    />
                  )}
                  <IconButton onClick={() => setExpanded(isExpanded ? null : course.id)}>
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>

            <Collapse in={isExpanded}>
              <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                <Stack spacing={1.5} sx={{ width: '100%' }}>
                  {sectionList.map((section) => {
                    const isSelected = selectedSections.get(course.id) === section.id;
                    const conflict = hasConflict(section);
                    const { dayDisplay, timeDisplay } = formatTimeSlots(section.timeSlots);

                    return (
                      <Card
                        key={section.id}
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          borderColor: isSelected
                            ? 'success.main'
                            : conflict
                              ? 'error.main'
                              : 'divider',
                          bgcolor: isSelected
                            ? 'success.main'
                            : conflict
                              ? 'error.main'
                              : 'transparent',
                          color: isSelected || conflict ? 'white' : 'inherit',
                          '&:hover': {
                            borderColor: 'primary.main',
                          },
                        }}
                        onClick={() => handleSelectSection(course.id, section.id)}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                Section {section.sectionNumber}
                              </Typography>
                              <Stack direction="row" spacing={2} mt={0.5}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Person sx={{ fontSize: 16 }} />
                                  <Typography variant="caption">{section.instructor}</Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Schedule sx={{ fontSize: 16 }} />
                                  <Typography variant="caption">
                                    {dayDisplay} {timeDisplay}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Box>
                            {isSelected && <Chip size="small" label="Selected" color="success" />}
                            {conflict && !isSelected && (
                              <Chip
                                size="small"
                                icon={<Warning />}
                                label="Conflict"
                                color="error"
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </CardActions>
            </Collapse>
          </Card>
        );
      })}

      {filteredCourses.length === 0 && (
        <Alert severity="info">No courses found matching your criteria.</Alert>
      )}

      {hasMoreCourses && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Button
            variant="outlined"
            onClick={() => setVisibleCount((count) => count + VISIBLE_COURSE_STEP)}
          >
            Load More Courses
          </Button>
        </Box>
      )}
    </Box>
  );
}
