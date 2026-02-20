import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Alert,
  Avatar,
  Divider,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Save, Phone, Palette, Psychology, CloudOff, DeleteForever } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { DEFAULT_PREFERENCES, savePreferences, getPreferences } from '../config/userConfig';
import {
  saveLlmConfig,
  getLlmConfig,
  DEFAULT_LLM_CONFIG,
  PROVIDER_OPTIONS,
  type BYOKConfig,
} from '../config/llmConfig';
import type { Preferences, LLMProvider } from '../types';

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, setMode } = useThemeMode();
  const [saved, setSaved] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);

  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [llmConfig, setLlmConfig] = useState<BYOKConfig>(DEFAULT_LLM_CONFIG);

  const savePreferencesHandler = useCallback(() => {
    savePreferences(preferences);
    setMode(preferences.theme || 'system');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [preferences, setMode]);

  const saveLlmConfigHandler = useCallback(() => {
    if (llmConfig.provider !== 'webllm' && !llmConfig.apiKey) {
      return false;
    }
    if (llmConfig.provider === 'custom' && !llmConfig.apiBaseUrl) {
      return false;
    }
    saveLlmConfig(llmConfig);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 3000);
    return true;
  }, [llmConfig]);

  useEffect(() => {
    setPreferences(getPreferences());
    setLlmConfig(getLlmConfig());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      savePreferencesHandler();
    }, 1000);
    return () => clearTimeout(timer);
  }, [preferences, savePreferencesHandler]);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveLlmConfigHandler();
    }, 1000);
    return () => clearTimeout(timer);
  }, [llmConfig, saveLlmConfigHandler]);

  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleProviderChange = (provider: LLMProvider) => {
    const option = PROVIDER_OPTIONS.find((o) => o.value === provider);
    setLlmConfig({
      ...llmConfig,
      provider,
      apiKey: provider === 'webllm' ? '' : llmConfig.apiKey,
      apiBaseUrl: provider === 'webllm' ? '' : option?.urlPlaceholder || '',
      model: option?.defaultModel || '',
    });
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === llmConfig.provider);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Settings
      </Typography>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Avatar sx={{ width: 48, height: 48 }}>{user?.displayName?.[0] || 'U'}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {user?.displayName || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.phoneNumber}
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Display Name"
                    value={preferences.displayName || user?.displayName || ''}
                    onChange={(e) =>
                      setPreferences({ ...preferences, displayName: e.target.value })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    value={user?.phoneNumber || ''}
                    disabled
                    fullWidth
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
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

        {/* Schedule Preferences */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <Palette color="primary" />
                <Typography variant="h6">Schedule Preferences</Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={4}>
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
                <Grid item xs={12} sm={4}>
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
                <Grid item xs={12} sm={4}>
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
                <Grid item xs={12}>
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

        {/* AI/LLM Settings */}
        <Grid item xs={12}>
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
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {llmConfig.provider === 'webllm'
                      ? 'Runs locally in your browser using WebGPU. No API key needed.'
                      : llmConfig.provider === 'wllama'
                        ? 'Fallback option that works without WebGPU. May be slower.'
                        : 'Cloud-based API. Requires valid API key.'}
                  </FormHelperText>
                </FormControl>

                {llmConfig.provider !== 'webllm' && llmConfig.provider !== 'wllama' && (
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Model"
                      value={llmConfig.model}
                      onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                      placeholder={selectedOption?.defaultModel}
                      helperText={
                        llmConfig.provider === 'webllm'
                          ? 'WebLLM model to load'
                          : 'Model name for API'
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
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

                {(llmConfig.provider === 'webllm' || llmConfig.provider === 'wllama') && (
                  <Alert severity="info" icon={<CloudOff />}>
                    {llmConfig.provider === 'webllm' ? (
                      <>
                        <strong>WebLLM Mode:</strong> Runs entirely in your browser using WebGPU.
                        Requires Chrome 113+ or Firefox 141+. First load may take longer as the
                        model downloads.
                      </>
                    ) : (
                      <>
                        <strong>Wllama Mode:</strong> Fallback option that works without WebGPU. May
                        be slower but works on more browsers.
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
          <Alert severity="success" sx={{ py: 0 }}>
            Settings auto-saved!
          </Alert>
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
