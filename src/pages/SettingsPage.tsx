import { AutoAwesome, CalendarToday, DeleteForever, Info, Psychology } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { PROVIDER_OPTIONS, STORAGE_KEYS } from '../utils/constants';
import { useConfigContext } from '../context/ConfigContext';
import { useThemeMode } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import { api } from '../services/apiClient';
import type { LLMProvider, Preferences, Semester } from '../types';
import { SchedulePreferences } from '../components/SchedulePreferences';
export default function SettingsPage() {
  const { user, profile, getToken, updateProfile } = useAuthContext();
  const { mode } = useThemeMode();
  const { preferences, llmConfig, updatePreferences, updateLlmConfig } = useConfigContext();
  const [saved, setSaved] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemester, setCurrentSemester] = useState<string>('');
  const [loadingSemesters, setLoadingSemesters] = useState(false);

  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const data = await getSemesters();
      setSemesters(data.semesters);
      const savedSemester = localStorage.getItem('auraishub_semester') || '';
      setCurrentSemester(savedSemester);
    } catch (error) {
      console.error('Error loading semesters:', error);
    } finally {
      setLoadingSemesters(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (preferences.theme && preferences.theme !== mode) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }, [preferences.theme, mode]);

  const handleSemesterChange = async (semesterId: string) => {
    try {
      const token = await getToken();
      await api.post('/user-profile', { semesterId }, token);
      localStorage.setItem('auraishub_semester', semesterId);
      setCurrentSemester(semesterId);
      setSemesterDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error changing semester:', error);
    }
  };

  const handleClearData = () => {
    const APP_KEY_PREFIX = 'auraishub_';
    const APP_SPECIFIC_KEYS = [STORAGE_KEYS.COURSE_SELECTIONS, STORAGE_KEYS.THEME_MODE];

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(APP_KEY_PREFIX) || APP_SPECIFIC_KEYS.includes(key as any)) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const option = PROVIDER_OPTIONS.find((o) => o.value === provider);

    updateLlmConfig({
      ...llmConfig,
      provider,
      model: option?.defaultModel || '',
    });
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === llmConfig.provider);
  const isLocalProvider = llmConfig.provider === 'webllm';

  const handlePreferencesSave = async (prefs: Preferences) => {
    try {
      await updateProfile({ preferences: prefs });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving schedule preferences:', error);
    }
  };

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
        }}
      >
        Settings
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Avatar sx={{ width: 48, height: 48 }}>{user?.displayName?.[0] || 'U'}</Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    {user?.displayName || 'User'}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    {user?.email}
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={mode}
                      label="Theme"
                      onChange={(e) =>
                        updatePreferences({
                          ...preferences,
                          theme: e.target.value as 'light' | 'dark' | 'system',
                        })
                      }
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="system">System</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CalendarToday />}
                    onClick={() => setSemesterDialogOpen(true)}
                    sx={{ height: 56 }}
                  >
                    {currentSemester ? `Current: ${currentSemester}` : 'Change Semester'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Psychology color="secondary" />
                <Typography variant="h6">AI Optimization Settings</Typography>
              </Stack>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 3,
                }}
              >
                Configure your preferred AI provider for schedule optimization.
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>AI Provider</InputLabel>
                  <Select
                    value={llmConfig.provider}
                    label="AI Provider"
                    onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                    startAdornment={<Psychology sx={{ mr: 1, color: 'secondary.main' }} />}
                  >
                    {PROVIDER_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box>
                          <Typography variant="body1">{option.label}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                            }}
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {selectedOption?.description}
                    {selectedOption?.learnMoreUrl && (
                      <>
                        {' '}
                        <Link
                          href={selectedOption.learnMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                        >
                          Learn more
                        </Link>
                      </>
                    )}
                  </FormHelperText>
                </FormControl>

                {!isLocalProvider && (
                  <TextField
                    fullWidth
                    label="API Key (Optional)"
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => updateLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                    placeholder="gsk_..."
                    helperText="Optional. A shared key is used by default for Groq."
                  />
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    {isLocalProvider ? (
                      <TextField
                        fullWidth
                        label="Model"
                        value="Task-Optimized (Auto)"
                        disabled
                        helperText="The app automatically selects the best model for each task."
                        slotProps={{
                          input: {
                            startAdornment: (
                              <AutoAwesome sx={{ mr: 1, color: 'secondary.main', fontSize: 18 }} />
                            ),
                          },
                        }}
                      />
                    ) : (
                      <TextField
                        fullWidth
                        label="Model"
                        value={llmConfig.model}
                        onChange={(e) => updateLlmConfig({ ...llmConfig, model: e.target.value })}
                        placeholder={selectedOption?.defaultModel}
                        helperText="Model name for API"
                        slotProps={{
                          input: { type: 'text' },
                        }}
                      />
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Temperature"
                      value={llmConfig.temperature}
                      onChange={(e) =>
                        updateLlmConfig({
                          ...llmConfig,
                          temperature: parseFloat(e.target.value) || 0.7,
                        })
                      }
                      slotProps={{
                        htmlInput: { step: 0.1, min: 0, max: 2 },
                      }}
                      helperText="Higher = more creative, Lower = more focused"
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  type="number"
                  label="Max Tokens"
                  value={llmConfig.maxTokens}
                  onChange={(e) =>
                    updateLlmConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) || 1024 })
                  }
                  slotProps={{
                    htmlInput: { step: 64, min: 256, max: 8192 },
                  }}
                  helperText="Maximum response length"
                />

                <Divider />

                {isLocalProvider && (
                  <Alert severity="info" icon={<Info />}>
                    <strong>Fast Local AI (GPU):</strong> Your AI runs completely on your device
                    using hardware acceleration. First load may take a minute to download the model.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SchedulePreferences
            initialPreferences={profile?.preferences}
            onSave={handlePreferencesSave}
            autoSave={true}
          />
        </Grid>
      </Grid>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 3,
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForever />}
          onClick={() => setClearDataOpen(true)}
        >
          Clear All Data
        </Button>
        {saved && (
          <Typography
            variant="body2"
            sx={{
              color: 'success.main',
              fontWeight: 600,
            }}
          >
            Settings saved automatically!
          </Typography>
        )}
      </Stack>
      <Dialog open={clearDataOpen} onClose={() => setClearDataOpen(false)}>
        <DialogTitle>Clear All Data?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete all your courses, preferences, and AI settings. This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDataOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleClearData}>
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={semesterDialogOpen} onClose={() => setSemesterDialogOpen(false)}>
        <DialogTitle>Change Semester</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {loadingSemesters ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : semesters.length === 0 ? (
            <Alert severity="warning">No semesters available. Please contact support.</Alert>
          ) : (
            <Stack spacing={2} sx={{ py: 2 }}>
              {semesters.map((semester) => (
                <Card
                  key={semester.id}
                  sx={{
                    cursor: 'pointer',
                    border: currentSemester === semester.id ? 2 : 1,
                    borderColor: currentSemester === semester.id ? 'secondary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'secondary.main',
                      boxShadow: 2,
                    },
                  }}
                  onClick={() => handleSemesterChange(semester.id)}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{
                        alignItems: 'center',
                      }}
                    >
                      <CalendarToday
                        color={currentSemester === semester.id ? 'secondary' : 'action'}
                      />
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                          }}
                        >
                          {semester.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {currentSemester === semester.id ? 'Current semester' : 'Click to select'}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
          <Alert severity="info" sx={{ mt: 2 }}>
            Changing your semester will reload the page with the new course data.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSemesterDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
