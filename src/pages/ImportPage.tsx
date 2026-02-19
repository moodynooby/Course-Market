import { useCallback, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Upload,
  Description,
  Delete,
  CheckCircle,
  Warning,
  CloudUpload,
} from '@mui/icons-material';
import { parseCSV, generateSampleCSV } from '../utils/csv';
import { saveCourses, getCourses } from '../services/database';
import { useNavigate } from 'react-router-dom';
import type { Course, Section } from '../types';

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [parseResults, setParseResults] = useState<
    {
      courses: Course[];
      sections: Section[];
      errors: string[];
      warnings: string[];
      filename: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const navigate = useNavigate();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setParseResults([]);

    const results: typeof parseResults = [];
    const allCourses: Course[] = [];
    const allSections: Section[] = [];

    for (const file of files) {
      try {
        const content = await file.text();
        const result = parseCSV(content);

        results.push({
          courses: result.courses,
          sections: result.sections,
          errors: result.errors,
          warnings: result.warnings,
          filename: file.name,
        });

        allCourses.push(...result.courses);
        allSections.push(...result.sections);
      } catch (error) {
        results.push({
          courses: [],
          sections: [],
          errors: [`Failed to parse ${file.name}: ${(error as Error).message}`],
          warnings: [],
          filename: file.name,
        });
      }
    }

    setParseResults(results);

    if (allCourses.length > 0) {
      saveCourses(allCourses, allSections);
      setImported(true);
    }

    setLoading(false);
  };

  const handleLoadSample = async () => {
    setLoading(true);
    const sampleCSV = generateSampleCSV();
    const result = parseCSV(sampleCSV);

    if (result.success) {
      saveCourses(result.courses, result.sections);
      setParseResults([
        {
          courses: result.courses,
          sections: result.sections,
          errors: result.errors,
          warnings: result.warnings,
          filename: 'sample_courses.csv',
        },
      ]);
      setImported(true);
    }

    setLoading(false);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files).filter((f) =>
      f.name.endsWith('.csv'),
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Import Courses
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload one or more CSV files containing course data
      </Typography>

      <Card
        sx={{
          mb: 3,
          p: 2,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
          }}
        >
          <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Drag and drop CSV files here
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            or click to browse (multiple files allowed)
          </Typography>
          <Button variant="contained" component="label" startIcon={<Upload />} size="large">
            Select Files
            <input type="file" accept=".csv" multiple hidden onChange={handleFileSelect} />
          </Button>
        </Box>
      </Card>

      {files.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected Files ({files.length})
            </Typography>
            <List>
              {files.map((file, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Description />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${(file.size / 1024).toFixed(1)} KB`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => handleRemoveFile(index)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={loading || files.length === 0}
                size="large"
              >
                {loading ? <LinearProgress sx={{ width: '100%' }} /> : 'Import Files'}
              </Button>
              <Button variant="outlined" onClick={handleLoadSample} disabled={loading}>
                Load Sample Data
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {parseResults.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>
            {parseResults.map((result, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  {result.errors.length > 0 ? (
                    <Warning color="error" />
                  ) : (
                    <CheckCircle color="success" />
                  )}
                  <Typography variant="subtitle1" fontWeight={600}>
                    {result.filename}
                  </Typography>
                  {result.errors.length === 0 && (
                    <Chip
                      size="small"
                      label={`${result.courses.length} courses, ${result.sections.length} sections`}
                      color="success"
                    />
                  )}
                </Stack>

                {result.errors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {result.errors.join(', ')}
                  </Alert>
                )}

                {result.warnings.length > 0 && (
                  <Alert severity="warning">{result.warnings.join(', ')}</Alert>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {imported && (
        <Alert
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/courses')}>
              Browse Courses
            </Button>
          }
        >
          Courses imported successfully! You can now browse and select your courses.
        </Alert>
      )}

      <Card sx={{ mt: 3, bgcolor: 'primary.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            CSV Format Requirements
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Your CSV files should include these headers:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {[
              'Course Code',
              'Course Name',
              'Subject',
              'Section',
              'Instructor',
              'Days',
              'Start Time',
              'End Time',
              'Location',
              'Credits',
            ].map((header) => (
              <Chip key={header} label={header} variant="outlined" />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
