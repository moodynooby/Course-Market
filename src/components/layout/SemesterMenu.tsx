import { CalendarMonth, Check, KeyboardArrowDown } from '@mui/icons-material';
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseSelection } from '../../context/CourseSelectionContext';

export function SemesterMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { semesterId, semesterName, availableSemesters, switchSemester } = useCourseSelection();

  const handleSemesterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSemesterChange = async (newSemesterId: string) => {
    setAnchorEl(null);
    if (newSemesterId === semesterId) return;

    try {
      await switchSemester(newSemesterId);
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
        {semesterName || semesterId || 'Semester'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 3 } } }}
      >
        {availableSemesters.length === 0 ? (
          <MenuItem disabled>Loading semesters…</MenuItem>
        ) : (
          availableSemesters.map((semester) => (
            <MenuItem
              key={semester.id}
              selected={semester.id === semesterId}
              onClick={() => handleSemesterChange(semester.id)}
            >
              <ListItemText>{semester.name}</ListItemText>
              {semester.id === semesterId && (
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Check fontSize="small" color="primary" />
                </ListItemIcon>
              )}
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
