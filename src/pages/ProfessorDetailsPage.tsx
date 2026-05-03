import { ArrowBack, ThumbDown, ThumbUp } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { professorsApi } from '../services/professorsApi';
import type { ProfessorDetails } from '../types';
import RateProfessorModal from '../components/RateProfessorModal';

export default function ProfessorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const [professor, setProfessor] = useState<ProfessorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await professorsApi.getProfessorDetails(parseInt(id));
      setProfessor(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching professor details:', err);
      setError('Failed to load professor details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !professor) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Professor not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/professors')} sx={{ mt: 2 }}>
          Back to Professors
        </Button>
      </Container>
    );
  }

  const takeAgainCount = professor.ratings.filter((r) => r.takeAgain).length;
  const takeAgainPercent =
    professor.ratings.length > 0
      ? Math.round((takeAgainCount / professor.ratings.length) * 100)
      : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/professors')} sx={{ mb: 3 }}>
        Back to Professors
      </Button>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={3} sx={{ position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                {professor.name}
              </Typography>
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }} gutterBottom>
                {professor.department || 'General'}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {Number(professor.avgRating).toFixed(1)}
                </Typography>
                <Rating value={Number(professor.avgRating)} precision={0.5} readOnly size="large" />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Based on {professor.ratingCount} ratings
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Would take again</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {takeAgainPercent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={takeAgainPercent}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">Difficulty</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {Number(professor.avgDifficulty).toFixed(1)} / 5
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(Number(professor.avgDifficulty) / 5) * 100}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Stack>

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 4 }}
                onClick={() => {
                  if (isAuthenticated) {
                    setModalOpen(true);
                  } else {
                    navigate('/login', { state: { from: `/professors/${id}` } });
                  }
                }}
              >
                Rate Professor
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Student Ratings
          </Typography>

          <Stack spacing={3} sx={{ mt: 3 }}>
            {professor.ratings.map((rating) => (
              <Card key={rating.id} variant="outlined">
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <Box sx={{ textAlign: { xs: 'left', sm: 'center' } }}>
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                          QUALITY
                        </Typography>
                        <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {rating.rating}
                        </Typography>

                        <Typography
                          variant="overline"
                          sx={{ color: 'text.secondary', mt: 1, display: 'block' }}
                        >
                          DIFFICULTY
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'medium' }}>
                          {rating.difficulty}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 9 }}>
                      <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                        <Chip label={rating.courseCode} size="small" />
                        <Chip label={rating.semesterId} variant="outlined" size="small" />
                        {rating.takeAgain ? (
                          <Chip
                            icon={<ThumbUp fontSize="small" />}
                            label="Would take again"
                            color="success"
                            variant="outlined"
                            size="small"
                          />
                        ) : (
                          <Chip
                            icon={<ThumbDown fontSize="small" />}
                            label="Would not take again"
                            color="error"
                            variant="outlined"
                            size="small"
                          />
                        )}
                      </Stack>
                      <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
                        {rating.comment}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ mt: 2, display: 'block', color: 'text.secondary' }}
                      >
                        Posted on {new Date(rating.createdAt).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
            {professor.ratings.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                  No ratings yet. Be the first to rate!
                </Typography>
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>

      <RateProfessorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        professorId={professor.id}
        professorName={professor.name}
        onSuccess={fetchDetails}
      />
    </Container>
  );
}
