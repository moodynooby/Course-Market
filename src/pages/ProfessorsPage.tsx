import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  TextField,
  Grid,
  Box,
  CircularProgress,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { GlassCard } from '../components/GlassAppBar';
import { professorsApi } from '../services/professorsApi';
import { getSemesters } from '../services/coursesApi';
import { Professor, Semester } from '../types';
import { useNavigate } from 'react-router-dom';

const ProfessorsPage: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const navigate = useNavigate();

  const fetchSemesters = useCallback(async () => {
    try {
      const data = await getSemesters();
      setSemesters(data.semesters);
    } catch (error) {
      console.error('Failed to fetch semesters:', error);
    }
  }, []);

  const fetchProfessors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await professorsApi.getProfessors(search, subject, semesterId);
      setProfessors(data);
    } catch (error) {
      console.error('Failed to fetch professors:', error);
    } finally {
      setLoading(false);
    }
  }, [search, subject, semesterId]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfessors();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProfessors]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Professors
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find and rate your instructors
        </Typography>
      </Box>

      <GlassCard sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search professors by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
            <TextField
              fullWidth
              select
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <MenuItem value="">All Subjects</MenuItem>
              <MenuItem value="CS">Computer Science</MenuItem>
              <MenuItem value="MATH">Mathematics</MenuItem>
              <MenuItem value="PHYS">Physics</MenuItem>
              <MenuItem value="BIO">Biology</MenuItem>
              <MenuItem value="CHEM">Chemistry</MenuItem>
              <MenuItem value="ENG">English</MenuItem>
              <MenuItem value="HIST">History</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
            <TextField
              fullWidth
              select
              label="Semester"
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
            >
              <MenuItem value="">All Semesters</MenuItem>
              {semesters.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </GlassCard>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {professors.map((prof) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prof.id}>
              <GlassCard
                sx={{
                  p: 3,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate(`/professor/${prof.id}`)}
              >
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {prof.name}
                </Typography>
                <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {prof.subjects.map((s) => (
                    <Typography
                      key={s}
                      variant="caption"
                      sx={{
                        bgcolor: 'action.selected',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.7rem',
                      }}
                    >
                      {s}
                    </Typography>
                  ))}
                </Box>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Rating
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight="bold">
                      {prof.avgRating > 0 ? prof.avgRating.toFixed(1) : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary">
                      Difficulty
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {prof.avgDifficulty > 0 ? prof.avgDifficulty.toFixed(1) : 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: 'block' }}
                >
                  {prof.totalRatings} ratings • {prof.takeAgainPercent}% would take again
                </Typography>
              </GlassCard>
            </Grid>
          ))}
          {!loading && professors.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  No professors found matching your search.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try a different name or subject.
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default ProfessorsPage;
