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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Divider,
} from '@mui/material';
import {
  Upload,
  Description,
  Delete,
  CheckCircle,
  Warning,
  CloudUpload,
  AutoAwesome,
  Send,
} from '@mui/icons-material';
import { generateSampleCSV } from '../utils/csv';
import { parseCSVWithAI } from '../services/aiCsvParser';
import { saveCourses } from '../services/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { REQUIRED_CSV_HEADERS } from '../constants/csvHeaders';
import type { Course, Section, HeaderMapping } from '../types';

export default function ImportPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [parseResults, setParseResults] = useState<{
    courses: Course[];
    sections: Section[];
    errors: string[];
    warnings: string[];
    filename: string;
    suggestedMappings?: HeaderMapping[];
    appliedMappings?: HeaderMapping[];
    content?: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const navigate = useNavigate();

  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [currentMappingResultIndex, setCurrentMappingResultIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
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
        const result = await parseCSVWithAI(content, user?.uid || 'guest');
        
        results.push({
          courses: result.courses,
          sections: result.sections,
          errors: result.errors,
          warnings: result.warnings,
          filename: file.name,
          suggestedMappings: result.suggestedMappings,
          appliedMappings: result.appliedMappings,
          content
        });
        
        if (result.success) {
          allCourses.push(...result.courses);
          allSections.push(...result.sections);
        }
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
    
    if (allCourses.length > 0 && !results.some(r => r.suggestedMappings)) {
      saveCourses(allCourses, allSections);
      setImported(true);
    }
    
    setLoading(false);
  };

  const handleLoadSample = async () => {
    setLoading(true);
    const sampleCSV = generateSampleCSV();
    const result = await parseCSVWithAI(sampleCSV, user?.uid || 'guest');
    
    if (result.success) {
      saveCourses(result.courses, result.sections);
      setParseResults([{
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        filename: 'sample_courses.csv',
        appliedMappings: result.appliedMappings,
        content: sampleCSV
      }]);
      setImported(true);
    }
    
    setLoading(false);
  };

  const handleApplyMappings = async (index: number, mappings: HeaderMapping[]) => {
    setLoading(true);
    const resultToUpdate = parseResults[index];
    if (!resultToUpdate.content) return;

    try {
      const result = await parseCSVWithAI(resultToUpdate.content, user?.uid || 'guest', mappings);
      const newResults = [...parseResults];
      newResults[index] = {
        ...resultToUpdate,
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        suggestedMappings: result.suggestedMappings,
        appliedMappings: result.appliedMappings,
      };
      setParseResults(newResults);

      if (result.success) {
        // Collect all successful courses/sections
        const allCourses: Course[] = [];
        const allSections: Section[] = [];
        newResults.forEach(r => {
          if (r.courses.length > 0) {
            allCourses.push(...r.courses);
            allSections.push(...r.sections);
          }
        });
        saveCourses(allCourses, allSections);
        setImported(true);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
    setMappingDialogOpen(false);
  };

  const handleFeedbackSubmit = async (index: number) => {
    if (!feedback.trim()) return;
    setLoading(true);
    const resultToUpdate = parseResults[index];
    if (!resultToUpdate.content) return;

    try {
      const result = await parseCSVWithAI(
        resultToUpdate.content,
        user?.uid || 'guest',
        resultToUpdate.appliedMappings,
        feedback
      );
      const newResults = [...parseResults];
      newResults[index] = {
        ...resultToUpdate,
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        appliedMappings: result.appliedMappings,
      };
      setParseResults(newResults);
      setFeedback('');

      if (result.success) {
        const allCourses: Course[] = [];
        const allSections: Section[] = [];
        newResults.forEach(r => {
          if (r.courses.length > 0) {
            allCourses.push(...r.courses);
            allSections.push(...r.sections);
          }
        });
        saveCourses(allCourses, allSections);
        setImported(true);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
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
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              component="label"
              startIcon={<Upload />}
              size="large"
            >
              Select Files
              <input
                type="file"
                accept=".csv"
                multiple
                hidden
                onChange={handleFileSelect}
              />
            </Button>
            <Button variant="outlined" onClick={handleLoadSample} disabled={loading} size="large">
              Load Sample Data
            </Button>
          </Stack>
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
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    {result.warnings.join(', ')}
                  </Alert>
                )}

                {result.suggestedMappings && (
                  <Button
                    startIcon={<AutoAwesome />}
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                      setCurrentMappingResultIndex(index);
                      setMappingDialogOpen(true);
                    }}
                    sx={{ mb: 1 }}
                  >
                    Confirm Header Mappings
                  </Button>
                )}

                {!result.suggestedMappings && result.appliedMappings && (
                   <Paper sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                        <AutoAwesome sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
                        AI Feedback Loop
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Parsing not quite right? Teach the AI how to handle this file:
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="e.g., 'T-Th' means Tuesday and Thursday"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleFeedbackSubmit(index)}
                        />
                        <IconButton
                          color="primary"
                          onClick={() => handleFeedbackSubmit(index)}
                          disabled={!feedback.trim() || loading}
                        >
                          <Send />
                        </IconButton>
                      </Stack>
                   </Paper>
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
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/courses')}
            >
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
            {['Course Code', 'Course Name', 'Subject', 'Section', 'Instructor', 'Days', 'Start Time', 'End Time', 'Location', 'Credits'].map(header => (
              <Chip key={header} label={header} variant="outlined" />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Mapping Dialog */}
      <Dialog
        open={mappingDialogOpen}
        onClose={() => setMappingDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm CSV Header Mappings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The AI has guessed these mappings. Please correct any that are wrong.
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {currentMappingResultIndex !== null &&
              parseResults[currentMappingResultIndex]?.suggestedMappings?.map((mapping, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                  {mapping.csvHeader}
                </Typography>
                <Typography variant="body2">→</Typography>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Maps to</InputLabel>
                  <Select
                    value={mapping.mappedHeader}
                    label="Maps to"
                    onChange={(e) => {
                      const newResults = [...parseResults];
                      const currentResult = newResults[currentMappingResultIndex];
                      if (currentResult.suggestedMappings) {
                        const updatedMappings = [...currentResult.suggestedMappings];
                        updatedMappings[idx] = { ...updatedMappings[idx], mappedHeader: e.target.value as string };
                        newResults[currentMappingResultIndex] = { ...currentResult, suggestedMappings: updatedMappings };
                        setParseResults(newResults);
                      }
                    }}
                  >
                    <MenuItem value="None">None</MenuItem>
                    {REQUIRED_CSV_HEADERS.map(h => (
                      <MenuItem key={h} value={h}>{h}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {mapping.isConfirmed ? <CheckCircle color="success" fontSize="small" /> : <AutoAwesome color="primary" fontSize="small" />}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (currentMappingResultIndex !== null) {
                handleApplyMappings(
                  currentMappingResultIndex,
                  parseResults[currentMappingResultIndex].suggestedMappings!
                );
              }
            }}
          >
            Apply & Parse
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}