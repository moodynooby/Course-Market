import { Email, Person, Phone } from '@mui/icons-material';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { ZodError } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { traderDetailsSchema } from '../../lib/schemas';

interface StepTraderDetailsProps {
  onComplete: (data: { displayName: string; email: string; phone: string }) => void;
  initialData?: {
    displayName?: string;
    email?: string;
    phone?: string;
  };
}

export function StepTraderDetails({ onComplete, initialData }: StepTraderDetailsProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    displayName: initialData?.displayName || user?.displayName || '',
    email: initialData?.email || user?.email || '',
    phone: initialData?.phone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    try {
      traderDetailsSchema.parse(formData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of e.issues) {
          const field = issue.path[0];
          if (field) {
            fieldErrors[field as string] = issue.message;
          }
        }
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await onComplete(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Trader Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Let's start with your basic information for trading
          </Typography>
        </Box>

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

        <TextField
          fullWidth
          label="Phone Number"
          type="tel"
          placeholder="+(555) 123-4567"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          error={!!errors.phone}
          helperText={errors.phone || "We'll use this for trade notifications"}
          InputProps={{
            startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          required
        />

        <Box sx={{ mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="accent"
            size="large"
            fullWidth
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Next: Select Semester'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
