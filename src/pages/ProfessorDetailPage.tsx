import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Button,
  Divider,
  Rating,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassCard } from '../components/GlassAppBar';
import { professorsApi } from '../services/professorsApi';
import { Professor, ProfessorRating } from '../types';
import ProfessorReviewForm from '../components/ProfessorReviewForm';
import { useAuthContext } from '../context/AuthContext';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const ProfessorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<{ professor: Professor; ratings: ProfessorRating[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const { user } = useAuthContext();

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await professorsApi.getProfessorDetail(parseInt(id));
      setData(result);
    } catch (error) {
      console.error('Failed to fetch professor details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Professor not found
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/professors')}>
          Back to Professors
        </Button>
      </Container>
    );
  }

  const { professor, ratings } = data;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/professors')} sx={{ mb: 4 }}>
        Back to Search
      </Button>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard sx={{ p: 3, position: { md: 'sticky' }, top: { md: 100 } }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {professor.name}
            </Typography>
            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {professor.subjects.map((s) => (
                <Chip key={s} label={s} size="small" variant="outlined" />
              ))}
            </Box>

            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h2" fontWeight="bold" color="primary.main">
                {professor.avgRating > 0 ? professor.avgRating.toFixed(1) : 'N/A'}
              </Typography>
              {professor.avgRating > 0 && (
                <Rating value={professor.avgRating} precision={0.1} readOnly size="large" />
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Overall quality based on {professor.totalRatings} ratings
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ py: 2 }}>
              <MetricRow label="Level of Difficulty" value={professor.avgDifficulty} />
              <MetricRow label="Would take again" value={professor.takeAgainPercent} isPercent />
              <MetricRow label="Chillness" value={professor.avgChillness} />
              <MetricRow label="Strictness" value={professor.avgStrictness} />
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              onClick={() => setIsReviewFormOpen(true)}
              disabled={!user}
            >
              {user ? 'Rate this Professor' : 'Login to Rate'}
            </Button>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
            {ratings.length} student reviews
          </Typography>

          {ratings.length === 0 ? (
            <GlassCard sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No reviews yet for {professor.name}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Be the first to share your experience!
              </Typography>
            </GlassCard>
          ) : (
            ratings.map((rating) => (
              <GlassCard key={rating.id} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <Box
                      sx={{
                        textAlign: 'center',
                        bgcolor: 'action.hover',
                        p: 2,
                        borderRadius: 4,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        fontWeight="bold"
                      >
                        QUALITY
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {rating.rating.toFixed(1)}
                      </Typography>

                      <Divider sx={{ my: 1 }} />

                      <Typography
                        variant="caption"
                        display="block"
                        color="text.secondary"
                        fontWeight="bold"
                      >
                        DIFFICULTY
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {rating.difficulty.toFixed(1)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 9 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {rating.courseCode}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Rated by {rating.userDisplayName}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rating.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {rating.takeAgain ? (
                        <Chip
                          label="Would take again"
                          color="success"
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      ) : (
                        <Chip
                          label="Would not take again"
                          color="error"
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      )}
                      {rating.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ))}
                    </Box>

                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {rating.comment}
                    </Typography>

                    <Box sx={{ mt: 2, display: 'flex', gap: 3 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          CHILLNESS
                        </Typography>
                        <Rating value={rating.chillness} readOnly size="small" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          STRICTNESS
                        </Typography>
                        <Rating value={rating.strictness} readOnly size="small" />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </GlassCard>
            ))
          )}
        </Grid>
      </Grid>

      <ProfessorReviewForm
        open={isReviewFormOpen}
        onClose={() => setIsReviewFormOpen(false)}
        professor={professor}
        onSuccess={fetchDetail}
      />
    </Container>
  );
};

const MetricRow = ({
  label,
  value,
  isPercent,
}: {
  label: string;
  value: number;
  isPercent?: boolean;
}) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" fontWeight="medium">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="bold">
        {value > 0 ? (isPercent ? `${value}%` : value.toFixed(1)) : 'N/A'}
      </Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={value > 0 ? (isPercent ? value : (value / 5) * 100) : 0}
      sx={{
        height: 8,
        borderRadius: 4,
        bgcolor: 'action.hover',
        '& .MuiLinearProgress-bar': {
          borderRadius: 4,
        },
      }}
    />
  </Box>
);

export default ProfessorDetailPage;
