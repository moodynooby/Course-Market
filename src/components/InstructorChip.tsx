import { Person, Star } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { splitInstructorNames } from '../utils/instructor-name';

interface InstructorRating {
  avgRating: number;
  ratingCount: number;
}

interface InstructorChipProps {
  instructor: string;
  professorRatings?: Map<string, InstructorRating>;
}

export function InstructorChip({ instructor, professorRatings }: InstructorChipProps) {
  const names = splitInstructorNames(instructor);

  return (
    <>
      {names.map((name, index, array) => {
        const rating = professorRatings?.get(name);
        return (
          <span key={name}>
            <Link
              to={`/professors?search=${encodeURIComponent(name)}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Person sx={{ fontSize: 14, color: 'primary.main' }} />
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {name}
              </Typography>
              {rating && rating.ratingCount > 0 && (
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.25 }} component="span">
                  <Star sx={{ fontSize: 13, color: 'gold' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      lineHeight: 1,
                    }}
                  >
                    {rating.avgRating.toFixed(1)}
                  </Typography>
                </Stack>
              )}
            </Link>
            {index < array.length - 1 && ', '}
          </span>
        );
      })}
    </>
  );
}
