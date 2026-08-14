import { CalendarMonth, Check, KeyboardArrowDown } from '@mui/icons-material';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { getSemesters } from '../../services/coursesApi';
import type { Semester } from '../../types';

export function SemesterMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuthContext();

  const handleSemesterMenuOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (semesters.length > 0 || loadingSemesters) return;

    try {
      setLoadingSemesters(true);
      const { semesters: availableSemesters } = await getSemesters();
      setSemesters(availableSemesters);
    } catch (error) {
      console.error('Failed to load semesters:', error);
    } finally {
      setLoadingSemesters(false);
    }
  };

  const handleSemesterChange = async (semesterId: string) => {
    if (semesterId === profile?.semesterId) {
      setAnchorEl(null);
      return;
    }

    try {
      await updateProfile({ semesterId, courseSelections: {} });
      setAnchorEl(null);
      navigate('/');
    } catch (error) {
      console.error('Failed to change semester:', error);
    }
  };

  return (
    <>
      <Button
        size="small"
        color="inherit"
        aria-haspopup="menu"
        onClick={handleSemesterMenuOpen}
        startIcon={<CalendarMonth fontSize="small" />}
        endIcon={<KeyboardArrowDown fontSize="small" />}
        sx={{
          display: { xs: 'none', sm: 'inline-flex' },
          color: 'text.secondary',
          fontWeight: 600,
          textTransform: 'none',
          maxWidth: 200,
        }}
      >
        {semesters.find((semester) => semester.id === profile?.semesterId)?.name ||
          profile?.semesterId ||
          'Semester'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 3 } } }}
      >
        {loadingSemesters ? (
          <MenuItem disabled>Loading semesters…</MenuItem>
        ) : (
          semesters.map((semester) => (
            <MenuItem
              key={semester.id}
              selected={semester.id === profile?.semesterId}
              onClick={() => handleSemesterChange(semester.id)}
            >
              <ListItemText>{semester.name}</ListItemText>
              {semester.id === profile?.semesterId && (
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Check fontSize="small" color="secondary" />
                </ListItemIcon>
              )}
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
