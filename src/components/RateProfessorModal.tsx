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

const RATING_LABELS: Record<number, string> = {
  1: 'Awful',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Average',
  4: 'Hard',
  5: 'Very Hard',
};

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

    if (!/[a-zA-Z]/.test(comment)) {
      setError('Comment must contain meaningful text.');
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
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Overall Quality</Typography>
              {rating && (
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  — {RATING_LABELS[rating]}
                </Typography>
              )}
            </Stack>
            <Rating
              name="rating"
              value={rating}
              onChange={(_, newValue) => setRating(newValue)}
              size="large"
            />
          </Box>

          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">Level of Difficulty</Typography>
              {difficulty && (
                <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                  — {DIFFICULTY_LABELS[difficulty]}
                </Typography>
              )}
            </Stack>
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
            helperText={`${courseCode.length}/50`}
            slotProps={{
              htmlInput: { maxLength: 50 },
              formHelperText: { sx: { textAlign: 'right' } },
            }}
          />

          <TextField
            fullWidth
            label="Comment"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            error={comment.length > 0 && comment.length < 10}
            slotProps={{
              htmlInput: { maxLength: 1000 },
              formHelperText: { component: 'div' },
            }}
            helperText={
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <span>
                  {comment.length > 0 && comment.length < 10
                    ? 'At least 10 characters required'
                    : 'Describe your experience with this professor'}
                </span>
                <span>{comment.length}/1000</span>
              </Stack>
            }
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
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            submitting ||
            !rating ||
            !difficulty ||
            comment.length < 10 ||
            !courseCode ||
            !semesterId
          }
          loading={submitting}
        >
          Submit Rating
        </Button>
      </DialogActions>
    </Dialog>
  );
}
