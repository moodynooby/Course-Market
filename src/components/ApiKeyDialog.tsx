import { Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import { useState } from 'react';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function ApiKeyDialog({ open, onClose, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    onSave(apiKey);
    setApiKey('');
  };

  const handleClose = () => {
    setApiKey('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Enter API Key</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          To use cloud AI, please enter your Groq API key. You can get one for free at groq.com
        </Alert>
        <TextField
          autoFocus
          fullWidth
          label="Groq API Key"
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="gsk_..."
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={showKey ? 'Hide API Key' : 'Show API Key'}>
                    <IconButton
                      aria-label={showKey ? 'Hide API Key' : 'Show API Key'}
                      onClick={() => setShowKey(!showKey)}
                      edge="end"
                    >
                      {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!apiKey.trim()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
