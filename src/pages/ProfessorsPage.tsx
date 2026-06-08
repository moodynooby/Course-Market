import { Clear, Search, Sort, Sync } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { useProfessorSearch } from '../hooks/useProfessorSearch';
import { professorsApi } from '../services/professorsApi';
import type { Professor } from '../types';

type SortKey = 'name' | 'rating' | 'count';

export default function ProfessorsPage() {
  const { isAuthenticated, getToken } = useAuthContext();
  const [searchParams] = useSearchParams();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('count');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const initialSearch = searchParams.get('search') || '';
  const [rawSearch, setRawSearch] = useState(initialSearch);
  const { results: filteredProfessors, setQuery } = useProfessorSearch(professors);

  useEffect(() => {
    setQuery(rawSearch);
  }, [rawSearch, setQuery]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) setRawSearch(search);
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
      const result = await professorsApi.syncProfessors(await getToken());
      await fetchProfessors();
      setSyncMessage(`Sync complete — ${result.instructorsFound} instructors found`);
    } catch (err) {
      console.error('Error syncing professors:', err);
      setError('Failed to sync professors.');
    } finally {
      setSyncing(false);
    }
  };

  const sortedProfessors = [...filteredProfessors].sort((a, b) => {
    if (sortBy === 'rating') return Number(b.avgRating || 0) - Number(a.avgRating || 0);
    if (sortBy === 'count') return (b.ratingCount || 0) - (a.ratingCount || 0);
    return a.name.localeCompare(b.name);
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
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

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by name..."
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {rawSearch && (
                    <Tooltip title="Clear search">
                      <IconButton
                        size="small"
                        onClick={() => setRawSearch('')}
                        aria-label="Clear search"
                        edge="end"
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          variant="outlined"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          sx={{ width: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Sort />
                </InputAdornment>
              ),
            },
          }}
        >
          <MenuItem value="name">Name (A-Z)</MenuItem>
          <MenuItem value="rating">Highest Rated</MenuItem>
          <MenuItem value="count">Most Ratings</MenuItem>
        </TextField>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small" onClick={fetchProfessors}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : sortedProfessors.length === 0 ? (
        professors.length === 0 ? (
          <EmptyState
            icon={<Sync sx={{ fontSize: 40 }} />}
            title="No professors found"
            description="Sync semester data to get started."
            action={
              isAuthenticated && (
                <Button variant="contained" onClick={handleSync}>
                  Sync Data
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            icon={<Search sx={{ fontSize: 40 }} />}
            title="No professors found"
            description="No professors found matching your search. Try adjusting your query."
          />
        )
      ) : (
        <VirtuosoGrid
          data={sortedProfessors}
          overscan={3}
          itemContent={(_index, professor) => (
            <Card
              component={Link}
              to={`/professors/${professor.id}`}
              variant="outlined"
              sx={{
                textDecoration: 'none',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: 'secondary.main',
                },
              }}
            >
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom noWrap>
                  {professor.name}
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
          )}
          style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}
          components={{
            List: forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
              ({ children, ...props }, ref) => (
                <Box
                  ref={ref}
                  {...props}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 3,
                  }}
                >
                  {children}
                </Box>
              ),
            ),
          }}
        />
      )}

      <Snackbar
        open={!!syncMessage}
        autoHideDuration={4000}
        onClose={() => setSyncMessage(null)}
        message={syncMessage}
      />
    </Container>
  );
}
