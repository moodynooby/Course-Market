import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Rating,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import { Professor } from '../types';
import { professorsApi } from '../services/professorsApi';
import { useAuthContext } from '../context/AuthContext';

interface ProfessorReviewFormProps {
  open: boolean;
  onClose: () => void;
  professor: Professor;
  onSuccess: () => void;
}

const TAG_OPTIONS = [
  'Tough Grader',
  'Great Lectures',
  'Respectful',
  'Extra Credit',
  'Hilarious',
  'Clear Grading Criteria',
  'Amazing Feedback',
  'Group Projects',
  'Heavy Homework',
  'Caring',
];

const ProfessorReviewForm: React.FC<ProfessorReviewFormProps> = ({
  open,
  onClose,
  professor,
  onSuccess,
}) => {
  const { getToken } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rating, setRating] = useState<number | null>(3);
  const [difficulty, setDifficulty] = useState(3);
  const [chillness, setChillness] = useState(3);
  const [strictness, setStrictness] = useState(3);
  const [takeAgain, setTakeAgain] = useState<boolean>(true);
  const [courseCode, setCourseCode] = useState('');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (!rating || !courseCode || !comment) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      await professorsApi.submitRating(token, {
        professorId: professor.id,
        courseCode: courseCode.toUpperCase(),
        rating,
        difficulty,
        takeAgain,
        chillness,
        strictness,
        tags: selectedTags,
        comment,
      });
      onSuccess();
      onClose();
      // Reset form
      setRating(3);
      setDifficulty(3);
      setChillness(3);
      setStrictness(3);
      setTakeAgain(true);
      setCourseCode('');
      setComment('');
      setSelectedTags([]);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rate Professor: {professor.name}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Typography color="error" gutterBottom sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            Overall Rating *
          </Typography>
          <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            How difficult was this professor? (1-5) *
          </Typography>
          <Slider
            value={difficulty}
            onChange={(_, v) => setDifficulty(v as number)}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: 'Easy' },
              { value: 5, label: 'Hard' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            How chill was this professor? (1-5)
          </Typography>
          <Slider
            value={chillness}
            onChange={(_, v) => setChillness(v as number)}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: 'Low' },
              { value: 5, label: 'High' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            How strict was this professor? (1-5)
          </Typography>
          <Slider
            value={strictness}
            onChange={(_, v) => setStrictness(v as number)}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: 'Low' },
              { value: 5, label: 'High' },
            ]}
            valueLabelDisplay="auto"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            Would you take this professor again?
          </Typography>
          <ToggleButtonGroup
            value={takeAgain}
            exclusive
            onChange={(_, v) => v !== null && setTakeAgain(v)}
            size="small"
            color="primary"
          >
            <ToggleButton value={true}>Yes</ToggleButton>
            <ToggleButton value={false}>No</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          fullWidth
          label="Course Code (e.g. CS101) *"
          variant="outlined"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          sx={{ mb: 3 }}
          size="small"
        />

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom variant="subtitle2">
            Tags
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {TAG_OPTIONS.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => handleTagToggle(tag)}
                color={selectedTags.includes(tag) ? 'primary' : 'default'}
                variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>
        </Box>

        <TextField
          fullWidth
          label="What's your experience with this professor? *"
          multiline
          rows={4}
          variant="outlined"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfessorReviewForm;
