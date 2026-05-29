import {
  AutoAwesome,
  CalendarToday,
  DeleteForever,
  ExpandMore,
  Info,
  Person,
  Psychology,
  Schedule,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SchedulePreferences } from '../components/SchedulePreferences';
import { useAuthContext } from '../context/AuthContext';
import { useConfigContext } from '../context/ConfigContext';
import { useThemeMode } from '../context/ThemeContext';
import { getSemesters } from '../services/coursesApi';
import { clearCache } from '../services/dbCache';
import type { LLMProvider, Preferences, Semester } from '../types';
import { PROVIDER_OPTIONS, STORAGE_KEYS } from '../utils/constants';

const TABS = [
  { label: 'General', icon: <Person /> },
  { label: 'Schedule', icon: <Schedule /> },
  { label: 'AI & LLM', icon: <Psychology /> },
  { label: 'Data', icon: <DeleteForever /> },
];

export default function SettingsPage() {
  const { user, profile, updateProfile } = useAuthContext();
  const { mode, setMode } = useThemeMode();
  const { llmConfig, updateLlmConfig, updatePreferences } = useConfigContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemester, setCurrentSemester] = useState<string>('');
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabFromParam = searchParams.get('tab');
  const tabIndex =
    tabFromParam === 'schedule' ? 1 : tabFromParam === 'ai' ? 2 : tabFromParam === 'data' ? 3 : 0;
  const [activeTab, setActiveTab] = useState(tabIndex);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const tabMap = ['', 'schedule', 'ai', 'data'];
    if (newValue === 0) {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabMap[newValue] });
    }
  };

  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const data = await getSemesters();
      setSemesters(data.semesters);
      setCurrentSemester(profile?.semesterId || '');
    } catch (error) {
      console.error('Error loading semesters:', error);
    } finally {
      setLoadingSemesters(false);
    }
  }, [profile?.semesterId]);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const handleSemesterChange = async (semesterId: string) => {
    try {
      await updateProfile({ semesterId, courseSelections: {} });
      setCurrentSemester(semesterId);
      setSemesterDialogOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error changing semester:', error);
    }
  };

  const handleClearData = async () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    await clearCache();
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

  const handleThemeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    updatePreferences({ theme: newMode });
  };

  const handlePreferencesSave = (prefs: Preferences) => {
    updatePreferences(prefs);
    setSaved(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaved(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t, i) => (
          <Tab
            key={i}
            label={t.label}
            icon={t.icon}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        ))}
      </Tabs>

      {activeTab === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ width: 48, height: 48 }}>{user?.displayName?.[0] || 'U'}</Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {user?.displayName || 'User'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                      handleThemeChange(e.target.value as 'light' | 'dark' | 'system')
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
      )}

      {activeTab === 1 && (
        <SchedulePreferences
          initialPreferences={profile?.preferences}
          onSave={handlePreferencesSave}
          autoSave={true}
        />
      )}

      {activeTab === 2 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <Psychology color="secondary" />
              <Typography variant="h6">AI & LLM Settings</Typography>
            </Stack>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {selectedOption?.learnMoreUrl && (
                    <span>
                      <Link
                        href={selectedOption.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        Learn more
                      </Link>
                    </span>
                  )}
                </FormHelperText>
              </FormControl>

              {!isLocalProvider && (
                <TextField
                  fullWidth
                  label="API Key (Optional)"
                  type={showApiKey ? 'text' : 'password'}
                  value={llmConfig.apiKey}
                  onChange={(e) => updateLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder="gsk_..."
                  helperText="Optional. A shared key is used by default for Groq."
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showApiKey ? 'hide api key' : 'show api key'}
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                            size="small"
                          >
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
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
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  size="small"
                  onClick={() => setShowAdvancedAi(!showAdvancedAi)}
                  endIcon={
                    <ExpandMore
                      sx={{
                        transform: showAdvancedAi ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  }
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {showAdvancedAi ? 'Hide Advanced' : 'Show Advanced'}
                </Button>
              </Box>

              <Collapse in={showAdvancedAi}>
                <Stack spacing={3}>
                  <Grid container spacing={2}>
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
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Max Tokens"
                        value={llmConfig.maxTokens}
                        onChange={(e) =>
                          updateLlmConfig({
                            ...llmConfig,
                            maxTokens: parseInt(e.target.value, 10) || 1024,
                          })
                        }
                        slotProps={{
                          htmlInput: { step: 64, min: 256, max: 8192 },
                        }}
                        helperText="Maximum response length"
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Collapse>

              {isLocalProvider && (
                <Alert severity="info" icon={<Info />}>
                  <strong>Fast Local AI (GPU):</strong> Your AI runs completely on your device using
                  hardware acceleration. First load may take a minute to download the model.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <DeleteForever color="error" />
              <Typography variant="h6">Clear All Data</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              This will permanently delete all your courses, schedule selections, preferences, and
              AI settings. This action cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={() => setClearDataOpen(true)}
            >
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      )}

      {saved && (
        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600, mt: 2 }}>
          Settings saved automatically!
        </Typography>
      )}

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
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    border: currentSemester === semester.id ? 2 : 1,
                    borderColor: currentSemester === semester.id ? 'secondary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'secondary.main',
                    },
                  }}
                  onClick={() => handleSemesterChange(semester.id)}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <CalendarToday
                        color={currentSemester === semester.id ? 'secondary' : 'action'}
                      />
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {semester.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
            Changing your semester will clear your course selections and load data for the new
            semester.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSemesterDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
