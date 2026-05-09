import { Clear, Person, Search, Sync } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  InputAdornment,
  Rating,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { professorsApi } from '../services/professorsApi';
import type { Professor } from '../types';

export default function ProfessorsPage() {
  const { isAuthenticated, getToken } = useAuthContext();
  const [searchParams, _setSearchParams] = useSearchParams();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  const fetchProfessors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await professorsApi.getProfessors();
      setProfessors(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching professors:', err);
      setError('Failed to load professors. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessors();
  }, [fetchProfessors]);

  const handleSync = async () => {
    if (!isAuthenticated) return;
    try {
      setSyncing(true);
      const token = await getToken();
      await professorsApi.syncProfessors(token);
      await fetchProfessors();
    } catch (err) {
      console.error('Error syncing professors:', err);
      setError('Failed to sync professors.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProfessors = useMemo(() => {
    if (!searchTerm) return professors;
    const lowerSearch = searchTerm.toLowerCase();
    return professors.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerSearch) ||
        p.department?.toLowerCase().includes(lowerSearch),
    );
  }, [professors, searchTerm]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Rate My Prof
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Browse and rate your instructors
          </Typography>
        </Box>
        {isAuthenticated && (
          <Tooltip title="Sync professors from semester data">
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={20} /> : <Sync />}
              onClick={handleSync}
              disabled={syncing}
            >
              Sync Data
            </Button>
          </Tooltip>
        )}
      </Stack>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search by name or department..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <Tooltip title="Clear search">
                  <IconButton
                    aria-label="Clear search"
                    onClick={() => setSearchTerm('')}
                    edge="end"
                    size="small"
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProfessors.map((professor) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={professor.id}>
              <Card
                component={Link}
                to={`/professors/${professor.id}`}
                variant="outlined"
                sx={{
                  textDecoration: 'none',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {professor.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }} gutterBottom>
                    {professor.department || 'General'}
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Rating
                        value={Number(professor.avgRating) || 0}
                        precision={0.5}
                        readOnly
                        size="small"
                      />
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {Number(professor.avgRating) > 0
                          ? Number(professor.avgRating).toFixed(1)
                          : 'No ratings'}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {professor.ratingCount} {professor.ratingCount === 1 ? 'rating' : 'ratings'}
                    </Typography>
                  </Box>

                  {Number(professor.avgDifficulty) > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block' }}
                      >
                        Difficulty: {Number(professor.avgDifficulty).toFixed(1)} / 5
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
          {filteredProfessors.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <EmptyState
                icon={<Person sx={{ fontSize: 40 }} />}
                title="No professors found"
                description={
                  searchTerm
                    ? `No results for "${searchTerm}". Try adjusting your search term.`
                    : "We couldn't find any professors in the database."
                }
                action={
                  searchTerm ? (
                    <Button variant="outlined" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </Button>
                  ) : null
                }
              />
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
}
