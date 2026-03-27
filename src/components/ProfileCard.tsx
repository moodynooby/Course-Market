import {
  CalendarToday,
  Check,
  CloudUpload,
  Email,
  Folder,
  Person,
  Phone,
} from '@mui/icons-material';
import { Alert, Box, CircularProgress, Grid, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import type { Semester } from '../types';
import { getCoursesBySubject, getSemesterData, getSemesters } from '../services/coursesApi';
import { getCachedSemesterData } from '../services/dbCache';
import type { Course, Section } from '../types';
import { InfoCard, InteractiveCard } from './GlassAppBar';

interface ProfileCardProps {
  initialData?: {
    displayName?: string;
    email?: string;
    phone?: string;
    semesterId?: string;
  };
  onSave?: (data: {
    displayName: string;
    email: string;
    phone: string;
    semesterId?: string;
  }) => void | Promise<void>;
  showSemester?: boolean;
}

export function ProfileCard({ initialData, onSave, showSemester = true }: ProfileCardProps) {
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Semester state
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [selectingSemester, setSelectingSemester] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>(initialData?.semesterId || '');

  // Load semesters on mount
  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const response = await getSemesters();
      setSemesters(response.semesters);
    } catch (err) {
      console.error('[ProfileCard] Error loading semesters:', err);
    } finally {
      setLoadingSemesters(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (showSemester && !selectedSemester) {
      newErrors.semester = 'Please select a semester';
    }

    setErrors(newErrors);
    const valid = Object.keys(newErrors).length === 0;
    setIsValid(valid);
    return valid;
  }, [formData, selectedSemester, showSemester]);

  // Validate on formData changes (immediate feedback)
  useEffect(() => {
    validate();
  }, [validate]);

  // Auto-save on form change (debounced - 5 seconds)
  const handleSave = useCallback(async () => {
    if (!onSave || !isValid || saving) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        ...formData,
        semesterId: selectedSemester || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [formData, selectedSemester, onSave, isValid, saving]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 5000); // 5 second debounce

    return () => clearTimeout(timer);
  }, [handleSave]);

  const handleSelectSemester = async (semesterId: string) => {
    try {
      setSelectingSemester(semesterId);

      // Check cache first to avoid redundant fetch
      const cachedData = await getCachedSemesterData(semesterId);
      if (cachedData) {
        console.log('[ProfileCard] Using cached semester data');
        setSelectedSemester(semesterId);
        if (onSave) {
          await onSave({ ...formData, semesterId });
        }
        return;
      }

      // Fetch fresh data if not cached
      const semesterData = await getSemesterData(semesterId);

      const coursesBySubject = getCoursesBySubject(semesterData);
      const allCourses: Course[] = Object.values(coursesBySubject).flat();

      const allSections: Section[] = semesterData.sections.map((s) => ({
        id: s.id,
        courseId: s.courseCode,
        sectionNumber: s.sectionNumber,
        instructor: s.instructor,
        timeSlots: s.timeSlots,
        capacity: s.capacity,
        enrolled: s.enrolled,
      }));

      // Cache the data
      const { cacheSemesterData } = await import('../services/dbCache');
      await cacheSemesterData(semesterId, allCourses, allSections, semesterData.version);

      setSelectedSemester(semesterId);
      if (onSave) {
        await onSave({ ...formData, semesterId });
      }
    } catch (err) {
      console.error('[ProfileCard] Error loading semester data:', err);
    } finally {
      setSelectingSemester(null);
    }
  };

  return (
    <InfoCard sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Profile Information
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your trader profile and semester selection
        </Typography>
      </Box>

      <Stack spacing={3}>
        {/* Trader Details */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Display Name"
              placeholder="John Doe"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              error={!!errors.displayName}
              helperText={errors.displayName}
              InputProps={{
                startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Phone Number"
              type="tel"
              placeholder="+(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={!!errors.phone}
              helperText={errors.phone || "We'll keep it safe"}
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              required
            />
          </Grid>
        </Grid>

        {/* Semester Selection */}
        {showSemester && (
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Semester
            </Typography>

            {loadingSemesters ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : semesters.length === 0 ? (
              <Alert severity="warning">
                No semesters available. Please contact your administrator.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {semesters.map((semester) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={semester.id}>
                    <InteractiveCard
                      selected={selectedSemester === semester.id}
                      disabled={selectingSemester === semester.id}
                      onClick={() => handleSelectSemester(semester.id)}
                    >
                      <Box sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: 'accent.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'accent.main',
                            }}
                          >
                            {semester.jsonUrl ? (
                              <Folder fontSize="medium" />
                            ) : (
                              <CloudUpload fontSize="medium" />
                            )}
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {semester.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {semester.jsonUrl ? 'Ready to use' : 'Loading required'}
                            </Typography>
                          </Box>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1}>
                          {selectingSemester === semester.id ? (
                            <>
                              <Box sx={{ width: 14, height: 14 }}>
                                <CircularProgress size={14} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Loading...
                              </Typography>
                            </>
                          ) : selectedSemester === semester.id ? (
                            <>
                              <Check sx={{ fontSize: 16, color: 'success.main' }} />
                              <Typography variant="caption" color="success.main">
                                Selected
                              </Typography>
                            </>
                          ) : (
                            <>
                              <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                Click to select
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                    </InteractiveCard>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Semester Error */}
            {errors.semester && (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                ⚠️ {errors.semester}
              </Typography>
            )}
          </Box>
        )}

        {/* Save Status */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {saving && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
            >
              <CircularProgress size={16} sx={{ mr: 1 }} /> Saving...
            </Typography>
          )}
          {saveError && (
            <Typography
              variant="body2"
              color="error"
              sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
            >
              ⚠️ {saveError}
            </Typography>
          )}
          {saved && !saving && (
            <Typography
              variant="body2"
              color="success.main"
              sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}
            >
              <Check sx={{ fontSize: 16, mr: 0.5 }} /> Saved
            </Typography>
          )}
        </Box>
      </Stack>
    </InfoCard>
  );
}
