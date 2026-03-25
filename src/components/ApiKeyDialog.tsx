import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

export default function ApiKeyDialog({ open, onClose, onSave }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (open) setApiKey('');
  }, [open]);

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Enter Groq API Key</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            A shared API key is used by default. If you prefer to use your own key, you can provide
            it here. Get one from{' '}
            <Link href="https://console.groq.com/keys" target="_blank" rel="noopener">
              Groq Console
            </Link>
            .
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Groq API Key (Optional)"
            type="password"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            sx={{ mt: 2 }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Your API key is stored securely on our servers. It will be used when the shared key is
            unavailable.
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
