import { AutoAwesome, DeleteForever, Info, Psychology } from '@mui/icons-material';
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
import { useCallback, useEffect, useState } from 'react';
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
  savePreferences,
  STORAGE_KEYS,
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
    saveLlmConfig(config);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 3000);
    return true;
  }, []);

  useEffect(() => {
    setPreferences(getPreferences());
    setLlmConfig(getLlmConfig());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      savePreferencesHandler(preferences);
    }, 1000);
    return () => clearTimeout(timer);
  }, [preferences, savePreferencesHandler]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveLlmConfigHandler(llmConfig);
    }, 1000);
    return () => clearTimeout(timer);
  }, [llmConfig, saveLlmConfigHandler]);

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

    setLlmConfig({
      ...llmConfig,
      provider,
      model: option?.defaultModel || '',
    });
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === llmConfig.provider);
  const isLocalProvider = llmConfig.provider === 'webllm';

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
                <Psychology color="accent" />
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
                    startAdornment={<Psychology sx={{ mr: 1, color: 'accent.main' }} />}
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
                  <TextField
                    fullWidth
                    label="API Key (Optional)"
                    type="password"
                    value={llmConfig.apiKey}
                    onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
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
                        InputProps={{
                          startAdornment: (
                            <AutoAwesome sx={{ mr: 1, color: 'accent.main', fontSize: 18 }} />
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
                    <strong>Fast Local AI (GPU):</strong> Your AI runs completely on your device
                    using hardware acceleration. First load may take a minute to download the model.
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
