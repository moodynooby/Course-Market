import { AutoAwesome, DeleteForever, Info, Palette, Psychology } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BYOKConfig,
  DEFAULT_LLM_CONFIG,
  getLlmConfig,
  PROVIDER_OPTIONS,
  saveLlmConfig,
} from '../config/llmConfig';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  STORAGE_KEYS,
  savePreferences,
} from '../config/userConfig';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import type { LLMProvider, Preferences } from '../types';

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [saved, setSaved] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [llmConfig, setLlmConfig] = useState<BYOKConfig>(DEFAULT_LLM_CONFIG);

  const savePreferencesHandler = useCallback(
    (prefs: Preferences) => {
      savePreferences(prefs);
      setMode(prefs.theme || 'system');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    [setMode],
  );

  const saveLlmConfigHandler = useCallback((config: BYOKConfig) => {
    // Local providers don't need API keys
    const isLocal = config.provider === 'webllm' || config.provider === 'wllama';
    if (!isLocal && !config.apiKey) {
      return false;
    }
    if (config.provider === 'custom' && !config.apiBaseUrl) {
      return false;
    }
    saveLlmConfig(config);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 3000);
    return true;
  }, []);

  // Refs to track latest values and prevent stale closures
  const preferencesRef = useRef(preferences);
  const llmConfigRef = useRef(llmConfig);
  const savePreferencesRef = useRef(savePreferencesHandler);
  const saveLlmConfigRef = useRef(saveLlmConfigHandler);

  // Update refs when values change
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    llmConfigRef.current = llmConfig;
  }, [llmConfig]);

  useEffect(() => {
    savePreferencesRef.current = savePreferencesHandler;
  }, [savePreferencesHandler]);

  useEffect(() => {
    saveLlmConfigRef.current = saveLlmConfigHandler;
  }, [saveLlmConfigHandler]);

  useEffect(() => {
    setPreferences(getPreferences());
    setLlmConfig(getLlmConfig());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Use ref to get latest values and prevent stale closure
      savePreferencesRef.current(preferencesRef.current);
    }, 1000);
    return () => clearTimeout(timer);
  }, [preferences]); // Only depend on preferences, not the handler

  useEffect(() => {
    const timer = setTimeout(() => {
      // Use ref to get latest values and prevent stale closure
      saveLlmConfigRef.current(llmConfigRef.current);
    }, 1000);
    return () => clearTimeout(timer);
  }, [llmConfig]); // Only depend on llmConfig, not the handler

  const handleClearData = () => {
    const APP_KEY_PREFIX = 'auraishub_';
    const APP_SPECIFIC_KEYS = new Set<string>([
      STORAGE_KEYS.COURSE_SELECTIONS,
      STORAGE_KEYS.THEME_MODE,
    ]);

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(APP_KEY_PREFIX) || APP_SPECIFIC_KEYS.has(key)) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const option = PROVIDER_OPTIONS.find((o) => o.value === provider);
    const isLocal = provider === 'webllm' || provider === 'wllama';

    setLlmConfig({
      ...llmConfig,
      provider,
      apiKey: isLocal ? '' : llmConfig.apiKey,
      apiBaseUrl: isLocal ? '' : option?.urlPlaceholder || '',
      model: option?.defaultModel || '',
    });
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === llmConfig.provider);
  const isLocalProvider = llmConfig.provider === 'webllm' || llmConfig.provider === 'wllama';

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Avatar sx={{ width: 48, height: 48 }}>{user?.displayName?.[0] || 'U'}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {user?.displayName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
                        setPreferences({
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
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Palette color="primary" />
                <Typography variant="h6">Schedule Preferences</Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Preferred Start Time"
                    type="time"
                    value={preferences.preferredStartTime}
                    onChange={(e) =>
                      setPreferences({ ...preferences, preferredStartTime: e.target.value })
                    }
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Preferred End Time"
                    type="time"
                    value={preferences.preferredEndTime}
                    onChange={(e) =>
                      setPreferences({ ...preferences, preferredEndTime: e.target.value })
                    }
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Min Credits"
                    type="number"
                    value={preferences.minCredits}
                    onChange={(e) =>
                      setPreferences({ ...preferences, minCredits: parseInt(e.target.value) || 0 })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Max Credits"
                    type="number"
                    value={preferences.maxCredits}
                    onChange={(e) =>
                      setPreferences({ ...preferences, maxCredits: parseInt(e.target.value) || 24 })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Max Gap (minutes)"
                    type="number"
                    value={preferences.maxGapMinutes}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        maxGapMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferMorning}
                          onChange={(e) =>
                            setPreferences({ ...preferences, preferMorning: e.target.checked })
                          }
                        />
                      }
                      label="Prefer Morning Classes"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferAfternoon}
                          onChange={(e) =>
                            setPreferences({ ...preferences, preferAfternoon: e.target.checked })
                          }
                        />
                      }
                      label="Prefer Afternoon Classes"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.preferConsecutiveDays}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              preferConsecutiveDays: e.target.checked,
                            })
                          }
                        />
                      }
                      label="Prefer Consecutive Days"
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Psychology color="primary" />
                <Typography variant="h6">AI Optimization Settings</Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure your preferred AI provider for schedule optimization.
              </Typography>

              <Stack spacing={3}>
                <FormControl fullWidth>
                  <InputLabel>AI Provider</InputLabel>
                  <Select
                    value={llmConfig.provider}
                    label="AI Provider"
                    onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                    startAdornment={<Psychology sx={{ mr: 1, color: 'primary.main' }} />}
                  >
                    {PROVIDER_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box>
                          <Typography variant="body1">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
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
                  <>
                    <TextField
                      fullWidth
                      label="API Key"
                      type="password"
                      value={llmConfig.apiKey}
                      onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                      placeholder={llmConfig.provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                      helperText="Your API key is stored locally and never sent to our servers"
                    />

                    <TextField
                      fullWidth
                      label="API Base URL"
                      value={llmConfig.apiBaseUrl}
                      onChange={(e) => setLlmConfig({ ...llmConfig, apiBaseUrl: e.target.value })}
                      placeholder={selectedOption?.urlPlaceholder}
                      helperText={
                        llmConfig.provider === 'custom'
                          ? 'Required for custom providers'
                          : 'Optional - uses default if empty'
                      }
                    />
                  </>
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
                        InputProps={{
                          startAdornment: (
                            <AutoAwesome sx={{ mr: 1, color: 'primary.main', fontSize: 18 }} />
                          ),
                        }}
                      />
                    ) : (
                      <TextField
                        fullWidth
                        label="Model"
                        value={llmConfig.model}
                        onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                        placeholder={selectedOption?.defaultModel}
                        helperText="Model name for API"
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
                        setLlmConfig({
                          ...llmConfig,
                          temperature: parseFloat(e.target.value) || 0.7,
                        })
                      }
                      inputProps={{ step: 0.1, min: 0, max: 2 }}
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
                    setLlmConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) || 1024 })
                  }
                  inputProps={{ step: 64, min: 256, max: 8192 }}
                  helperText="Maximum response length"
                />

                <Divider />

                {isLocalProvider && (
                  <Alert severity="info" icon={<Info />}>
                    {llmConfig.provider === 'webllm' ? (
                      <>
                        <strong>Fast Local AI (GPU):</strong> Your AI runs completely on your device
                        using hardware acceleration. First load may take a minute to download the
                        model.
                      </>
                    ) : (
                      <>
                        <strong>Universal AI (CPU):</strong> A compatible backup that works on any
                        browser without needing a powerful GPU.
                      </>
                    )}
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteForever />}
          onClick={() => setClearDataOpen(true)}
        >
          Clear All Data
        </Button>
        {saved && (
          <Typography variant="body2" color="success.main" fontWeight={600}>
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
    </Box>
  );
}
