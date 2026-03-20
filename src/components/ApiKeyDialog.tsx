import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Link,
  Box,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';
import type { LLMProvider } from '../types';
import { PROVIDER_OPTIONS } from '../config/llmConfig';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  provider: LLMProvider;
  onSave: (key: string) => void;
}

export default function ApiKeyDialog({ open, onClose, provider, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const option = PROVIDER_OPTIONS.find((o) => o.value === provider);

  useEffect(() => {
    if (open) setApiKey('');
  }, [open]);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  const getProviderInfo = () => {
    switch (provider) {
      case 'groq':
        return {
          name: 'Groq',
          url: 'https://console.groq.com/keys',
          placeholder: 'gsk_...',
        };
      case 'openai':
        return {
          name: 'OpenAI',
          url: 'https://platform.openai.com/api-keys',
          placeholder: 'sk-...',
        };
      case 'anthropic':
        return {
          name: 'Anthropic',
          url: 'https://console.anthropic.com/settings/keys',
          placeholder: 'sk-ant-...',
        };
      default:
        return {
          name: 'Cloud AI',
          url: '#',
          placeholder: 'Enter API key',
        };
    }
  };

  const info = getProviderInfo();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Enter {info.name} API Key</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            To use {info.name}, you need a valid API key. You can get one from{' '}
            <Link href={info.url} target="_blank" rel="noopener">
              {info.name} Console
            </Link>
            .
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label={`${info.name} API Key`}
            type="password"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={info.placeholder}
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Your key is stored locally in your browser and is only sent to our secure backend proxy
            to communicate with {info.name}.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!apiKey.trim()}
          sx={{ borderRadius: 2 }}
        >
          Save & Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
