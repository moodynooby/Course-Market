import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Rating,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import { professorsApi } from '../services/professorsApi';
import type { Semester } from '../types';

interface RateProfessorModalProps {
  open: boolean;
  onClose: () => void;
  professorId: number;
  professorName: string;
  onSuccess: () => void;
}

export default function RateProfessorModal({
  open,
  onClose,
  professorId,
  professorName,
  onSuccess,
}: RateProfessorModalProps) {
  const { getToken } = useAuthContext();
  const [rating, setRating] = useState<number | null>(5);
  const [difficulty, setDifficulty] = useState<number | null>(3);
  const [comment, setComment] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [takeAgain, setTakeAgain] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getSemesters()
        .then((data) => setSemesters(data.semesters))
        .catch(console.error);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!rating || !difficulty || !comment || !courseCode || !semesterId) {
      setError('Please fill in all fields.');
      return;
    }

    if (comment.length < 10) {
      setError('Comment must be at least 10 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = await getToken();
      await professorsApi.submitRating(
        {
          professorId,
          rating,
          difficulty,
          comment,
          courseCode: courseCode.toUpperCase(),
          semesterId,
          takeAgain,
        },
        token,
      );
      onSuccess();
      onClose();
      // Reset form
      setRating(5);
      setDifficulty(3);
      setComment('');
      setCourseCode('');
      setSemesterId('');
      setTakeAgain(true);
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      setError(err.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rate Professor: {professorName}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Overall Quality
            </Typography>
            <Rating
              name="rating"
              value={rating}
              onChange={(_, newValue) => setRating(newValue)}
              size="large"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Level of Difficulty
            </Typography>
            <Rating
              name="difficulty"
              value={difficulty}
              onChange={(_, newValue) => setDifficulty(newValue)}
              size="large"
            />
          </Box>

          <FormControl fullWidth>
            <InputLabel>Semester</InputLabel>
            <Select
              value={semesterId}
              label="Semester"
              onChange={(e) => setSemesterId(e.target.value)}
            >
              {semesters.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Course Code (e.g. CS101)"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="E.g. COMP 248"
          />

          <TextField
            fullWidth
            label="Comment"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            helperText="At least 10 characters. Describe your experience with this professor."
          />

          <FormControlLabel
            control={
              <Switch
                checked={takeAgain}
                onChange={(e) => setTakeAgain(e.target.checked)}
                color="primary"
              />
            }
            label="I would take this professor again"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
