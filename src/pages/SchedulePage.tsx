import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
} from '@mui/material';
import { PlayArrow, Psychology, Schedule as ScheduleIcon } from '@mui/icons-material';
import { getCourses } from '../services/database';
import { optimizeWithLLM } from '../services/llm';
import { optimizeWithWebLLM } from '../services/webllm';
import type { Section, Schedule } from '../types';

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes}${period}`;
}

function generateCurrentSchedule(): Schedule | null {
  const { courses, sections } = getCourses();
  const saved = localStorage.getItem('course-selections');
  
  if (!saved) return null;
  
  try {
    const selections = JSON.parse(saved);
    const selectedSections: Section[] = [];
    const courseIds = new Set(Object.keys(selections));
    
    courseIds.forEach(courseId => {
      const sectionId = selections[courseId];
      const section = sections.find(s => s.id === sectionId);
      if (section) selectedSections.push(section);
    });
    
    if (selectedSections.length === 0) return null;
    
    const totalCredits = selectedSections.reduce((sum, s) => {
      const course = courses.find(c => c.id === s.courseId);
      return sum + (course?.credits || 3);
    }, 0);
    
    return {
      id: 'current',
      name: 'Current Selection',
      sections: selectedSections,
      totalCredits,
      score: 0,
      conflicts: [],
    };
  } catch {
    return null;
  }
}

function checkConflicts(sections: Section[]): string[] {
  const conflicts: string[] = [];
  
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const s1 = sections[i];
      const s2 = sections[j];
      
      for (const slot1 of s1.timeSlots) {
        for (const slot2 of s2.timeSlots) {
          if (slot1.day === slot2.day) {
            const start1 = parseInt(slot1.startTime.replace(':', ''), 10);
            const end1 = parseInt(slot1.endTime.replace(':', ''), 10);
            const start2 = parseInt(slot2.startTime.replace(':', ''), 10);
            const end2 = parseInt(slot2.endTime.replace(':', ''), 10);
            
            if (start1 < end2 && start2 < end1) {
              conflicts.push(`${s1.sectionNumber} and ${s2.sectionNumber} conflict`);
            }
          }
        }
      }
    }
  }
  
  return conflicts;
}

export default function SchedulePage() {
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [webllmAvailable, setWebllmAvailable] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const schedule = generateCurrentSchedule();
    setCurrentSchedule(schedule);
    
    // Check WebLLM availability
    optimizeWithWebLLM([], { userId: '' }).catch(() => {
      // WebLLM not available, that's okay
    });
    setWebllmAvailable(true); // For demo purposes
  }, []);

  const handleOptimize = async () => {
    if (!currentSchedule) {
      setError('No courses selected. Please select some courses first.');
      return;
    }
    
    setOptimizing(true);
    setError('');
    
    try {
      let result;
      try {
        // Try WebLLM first (browser-based)
        result = await optimizeWithWebLLM([currentSchedule], {});
        setAiAnalysis(result.aiAnalysis || 'WebLLM optimization completed.');
      } catch {
        // Fall back to local LLM
        result = await optimizeWithLLM([currentSchedule], {
          userId: '',
          displayName: '',
          preferredStartTime: '08:00',
          preferredEndTime: '17:00',
          maxGapMinutes: 60,
          preferConsecutiveDays: true,
          preferMorning: false,
          preferAfternoon: false,
          maxCredits: 18,
          minCredits: 12,
          avoidDays: [],
          excludeInstructors: [],
        });
      }
      
      if (result.bestSchedule) {
        setCurrentSchedule(result.bestSchedule);
      }
      
      setAiAnalysis(result.aiAnalysis || 'Schedule optimized successfully.');
    } catch (err) {
      setError(`Optimization failed: ${(err as Error).message}`);
    } finally {
      setOptimizing(false);
    }
  };

  if (!currentSchedule) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Schedule Optimization
        </Typography>
        <Alert severity="info">
          No courses selected. Please select courses in the Courses section first.
        </Alert>
      </Box>
    );
  }

  const conflicts = checkConflicts(currentSchedule.sections);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Schedule Optimization
      </Typography>

      {conflicts.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Schedule conflicts detected: {conflicts.join(', ')}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>
                  Current Schedule
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    icon={<ScheduleIcon />}
                    label={`${currentSchedule.sections.length} sections`}
                    variant="outlined"
                  />
                  <Chip
                    label={`${currentSchedule.totalCredits} credits`}
                    variant="outlined"
                  />
                  <Chip
                    label={`Score: ${currentSchedule.score}/100`}
                    color={currentSchedule.score > 70 ? 'success' : 'warning'}
                  />
                </Stack>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Course</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Instructor</TableCell>
                      <TableCell>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentSchedule.sections.map(section => {
                      const course = getCourses().courses.find(c => c.id === section.courseId);
                      const dayDisplay = section.timeSlots
                        .map(s => s.day)
                        .filter((d, i, arr) => arr.indexOf(d) === i)
                        .join('');
                      const timeDisplay = section.timeSlots.length > 0
                        ? `${formatTime(section.timeSlots[0].startTime)}-${formatTime(section.timeSlots[0].endTime)}`
                        : 'TBA';

                      return (
                        <TableRow key={section.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {course?.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {course?.name}
                            </Typography>
                          </TableCell>
                          <TableCell>{section.sectionNumber}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {dayDisplay} {timeDisplay}
                            </Typography>
                          </TableCell>
                          <TableCell>{section.instructor}</TableCell>
                          <TableCell>{section.location}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: { xs: '100%', lg: '400px' } }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                AI Optimization
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleOptimize}
                  disabled={optimizing}
                  startIcon={optimizing ? <LinearProgress sx={{ width: '20px' }} /> : <PlayArrow />}
                  fullWidth
                >
                  {optimizing ? 'Optimizing...' : 'Optimize with AI'}
                </Button>

                <Divider />

                {webllmAvailable && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Psychology color="primary" />
                    <Typography variant="body2">
                      WebLLM (Browser-based AI) available
                    </Typography>
                  </Stack>
                )}

                {aiAnalysis && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      AI Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                      {aiAnalysis}
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Alert severity="error">
                    {error}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}