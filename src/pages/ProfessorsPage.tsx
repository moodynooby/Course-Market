import { Clear, PersonSearch, Search, Sync } from '@mui/icons-material';
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
  Rating,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { VirtuosoGrid } from 'react-virtuoso';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { professorsApi } from '../services/professorsApi';
import { searchProfessors } from '../services/search';
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
    return searchProfessors(professors, searchTerm);
  }, [professors, searchTerm]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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
                <IconButton
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                  edge="end"
                  size="small"
                >
                  <Clear fontSize="small" />
                </IconButton>
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
      ) : filteredProfessors.length === 0 ? (
        <EmptyState
          icon={<PersonSearch sx={{ fontSize: 40 }} />}
          title="No professors found"
          description={`We couldn't find any results for "${searchTerm}". Try a different name or department.`}
          action={
            <Button variant="outlined" onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          }
        />
      ) : (
        <VirtuosoGrid
          data={filteredProfessors}
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
          )}
          style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
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
    </Container>
  );
}
