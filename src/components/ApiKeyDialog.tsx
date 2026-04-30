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
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useState } from 'react';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function ApiKeyDialog({ open, onClose, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
          type={showPassword ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="gsk_..."
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
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
