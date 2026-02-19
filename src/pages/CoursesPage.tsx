import { useState, useMemo, useEffect } from 'react';
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
} from '@mui/material';
import { ExpandMore, ExpandLess, Delete, Schedule, Person, LocationOn } from '@mui/icons-material';
import { getCourses, saveCourses } from '../services/database';
import type { Course, Section } from '../types';

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes}${period}`;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const data = getCourses();
    setCourses(data.courses);
    setSections(data.sections);

    // Load selections from localStorage
    const saved = localStorage.getItem('course-selections');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedSections(new Map(Object.entries(parsed)));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('course-selections', JSON.stringify(Object.fromEntries(selectedSections)));
  }, [selectedSections]);

  const subjects = useMemo(() => {
    const subs = new Set(courses.map((c) => c.subject));
    return Array.from(subs).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.name.toLowerCase().includes(search.toLowerCase()) ||
        course.code.toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subject === 'all' || course.subject === subject;
      return matchesSearch && matchesSubject;
    });
  }, [courses, search, subject]);

  const courseSections = (courseId: string) => sections.filter((s) => s.courseId === courseId);

  const getSelectedSection = (courseId: string) => {
    const sectionId = selectedSections.get(courseId);
    return sectionId ? sections.find((s) => s.id === sectionId) : undefined;
  };

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

  const hasConflict = (section: Section): boolean => {
    const selectedList = getSelectedSectionList();
    for (const sel of selectedList) {
      if (sel.id === section.id) continue;
      for (const slot1 of section.timeSlots) {
        for (const slot2 of sel.timeSlots) {
          if (slot1.day === slot2.day) {
            const start1 = parseInt(slot1.startTime.replace(':', ''), 10);
            const end1 = parseInt(slot1.endTime.replace(':', ''), 10);
            const start2 = parseInt(slot2.startTime.replace(':', ''), 10);
            const end2 = parseInt(slot2.endTime.replace(':', ''), 10);
            if (start1 < end2 && start2 < end1) return true;
          }
        }
      }
    }
    return false;
  };

  const getSelectedSectionList = (): Section[] => {
    const ids = Array.from(selectedSections.values());
    return sections.filter((s) => ids.includes(s.id));
  };

  const handleClearAll = () => {
    setSelectedSections(new Map());
  };

  if (courses.length === 0) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Course Browser
        </Typography>
        <Alert severity="info">No courses imported yet. Go to Import to add courses.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Course Browser
      </Typography>

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

      {filteredCourses.map((course) => {
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
                    const dayDisplay = section.timeSlots
                      .map((s) => s.day)
                      .filter((d, i, arr) => arr.indexOf(d) === i)
                      .join('');
                    const timeDisplay =
                      section.timeSlots.length > 0
                        ? `${formatTime(section.timeSlots[0].startTime)} - ${formatTime(section.timeSlots[0].endTime)}`
                        : 'TBA';

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
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <LocationOn sx={{ fontSize: 16 }} />
                                  <Typography variant="caption">{section.location}</Typography>
                                </Stack>
                              </Stack>
                            </Box>
                            {isSelected && <Chip size="small" label="Selected" color="success" />}
                            {conflict && !isSelected && (
                              <Chip size="small" label="Conflict" color="error" />
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
    </Box>
  );
}
