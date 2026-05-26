import { ArrowBack, School, Star, ThumbDown, ThumbUp } from '@mui/icons-material';
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
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import RateProfessorModal from '../components/RateProfessorModal';
import { useAuthContext } from '../context/AuthContext';
import { getSemesters } from '../services/coursesApi';
import { getCachedSections } from '../services/dbCache';
import { professorsApi } from '../services/professorsApi';
import type { ProfessorDetails } from '../types';
import { splitInstructorNames } from '../utils/instructor-name';

export default function ProfessorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const [professor, setProfessor] = useState<ProfessorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [coursesTaught, setCoursesTaught] = useState<{ semester: string; courses: string[] }[]>([]);

  useEffect(() => {
    if (!professor?.name) return;
    let cancelled = false;
    (async () => {
      try {
        const { semesters } = await getSemesters();
        const results: { semester: string; courses: string[] }[] = [];
        for (const sem of semesters) {
          const cached = await getCachedSections(sem.id);
          if (!cached) continue;
          const courseCodes = new Set<string>();
          for (const section of cached.sections) {
            if (splitInstructorNames(section.instructor).includes(professor.name)) {
              courseCodes.add(section.courseId);
            }
          }
          if (courseCodes.size > 0) {
            results.push({ semester: sem.name, courses: Array.from(courseCodes).sort() });
          }
        }
        if (!cancelled) setCoursesTaught(results);
      } catch {
        // Non-critical — degrades gracefully
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [professor?.name]);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await professorsApi.getProfessorDetails(parseInt(id, 10));
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

  const handleRateClick = () => {
    if (isAuthenticated) {
      setModalOpen(true);
    } else {
      navigate('/login', { state: { from: `/professors/${id}` } });
    }
  };

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
          <Card variant="outlined" sx={{ position: 'sticky', top: 24 }}>
            <CardContent>
              <Typography variant="h4" component="h1" gutterBottom>
                {professor.name}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="h3" sx={{ color: 'primary.main' }}>
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
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
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
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
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

              {coursesTaught.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    <School sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-top' }} />
                    Courses Taught
                  </Typography>
                  {coursesTaught.map((entry) => (
                    <Box key={entry.semester} sx={{ mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 600 }}
                      >
                        {entry.semester}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
                        {entry.courses.map((code) => (
                          <Chip key={code} label={code} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 4 }}
                onClick={handleRateClick}
              >
                Rate Professor
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" gutterBottom>
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
                        <Typography variant="h4" sx={{ color: 'primary.main' }}>
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
              <EmptyState
                icon={<Star sx={{ fontSize: 40 }} />}
                title="No ratings yet"
                description="Be the first to share your experience with this professor."
                action={
                  <Button variant="contained" onClick={handleRateClick}>
                    Rate Professor
                  </Button>
                }
              />
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
