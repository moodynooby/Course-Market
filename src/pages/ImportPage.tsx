import { useCallback, useState, useMemo } from 'react';
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
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  Upload,
  Description,
  Delete,
  CheckCircle,
  Warning,
  CloudUpload,
  ExpandMore,
  Lightbulb,
  Save,
  Map,
  Schedule,
} from '@mui/icons-material';
import { parseCSV, generateSampleCSV, detectCSVHeaders, getSuggestedHeaderMappings } from '../utils/csv';
import { parseScheduleField } from '../constants/csvHeaders';
import { saveCourses, getCourses } from '../services/database';
import { saveHeaderAlias, saveScheduleCorrection, getHeaderAliases } from '../services/feedback';
import { useNavigate } from 'react-router-dom';
import type { Course, Section } from '../types';

interface FileParseState {
  file: File;
  content: string;
  detectedHeaders: string[];
  suggestedMappings: Array<{ detected: string; suggested: string; confidence: number }>;
  missingHeaders: string[];
  headerCorrections: Record<string, string>;
  scheduleCorrections: Array<{ rowIndex: number; originalSchedule: string; days: string; startTime: string; endTime: string }>;
  needsCorrection: boolean;
  parseErrors: string[];
}

const CANONICAL_FIELDS = [
  { value: 'courseCode', label: 'Course Code', required: true },
  { value: 'courseName', label: 'Course Name', required: true },
  { value: 'subject', label: 'Subject', required: true },
  { value: 'sectionNumber', label: 'Section', required: true },
  { value: 'instructor', label: 'Instructor', required: true },
  { value: 'days', label: 'Days', required: false },
  { value: 'startTime', label: 'Start Time', required: false },
  { value: 'endTime', label: 'End Time', required: false },
  { value: 'schedule', label: 'Schedule (Combined)', required: false },
  { value: 'location', label: 'Location', required: true },
  { value: 'credits', label: 'Credits', required: true },
  { value: 'term', label: 'Term', required: false },
];

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<Record<string, FileParseState>>({});
  const [parseResults, setParseResults] = useState<{
    courses: Course[];
    sections: Section[];
    errors: string[];
    warnings: string[];
    filename: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [scheduleTestValue, setScheduleTestValue] = useState('');
  const [scheduleTestResult, setScheduleTestResult] = useState<ReturnType<typeof parseScheduleField> | null>(null);
  const navigate = useNavigate();

  const currentFileState = useMemo(() => {
    const file = files[currentFileIndex];
    return file ? fileStates[file.name] : null;
  }, [files, fileStates, currentFileIndex]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Pre-analyze each new file
      for (const file of newFiles) {
        try {
          const content = await file.text();
          const headers = detectCSVHeaders(content);
          const suggestions = getSuggestedHeaderMappings(headers);
          
          // Check which required fields are missing
          const mappedFields = new Set(suggestions.map(s => s.suggested));
          const requiredFields = ['courseCode', 'courseName', 'subject', 'sectionNumber', 'instructor', 'location', 'credits'];
          const missingHeaders = requiredFields.filter(f => !mappedFields.has(f));
          
          // Check time fields
          const hasTimeFields = mappedFields.has('days') && mappedFields.has('startTime') && mappedFields.has('endTime');
          const hasScheduleField = mappedFields.has('schedule');
          const missingTimeFields = !hasTimeFields && !hasScheduleField;
          
          const fileState: FileParseState = {
            file,
            content,
            detectedHeaders: headers,
            suggestedMappings: suggestions,
            missingHeaders: missingTimeFields ? [...missingHeaders, 'timeFields'] : missingHeaders,
            headerCorrections: {},
            scheduleCorrections: [],
            needsCorrection: missingHeaders.length > 0 || missingTimeFields || suggestions.some(s => s.confidence < 0.8),
            parseErrors: []
          };
          
          setFileStates(prev => ({ ...prev, [file.name]: fileState }));
        } catch (error) {
          console.error(`Failed to analyze ${file.name}:`, error);
        }
      }
    }
  }, []);

  const handleRemoveFile = (index: number) => {
    const file = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileStates(prev => {
      const { [file.name]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleStartCorrection = () => {
    setCurrentFileIndex(0);
    setCorrectionDialogOpen(true);
  };

  const handleHeaderCorrectionChange = (detectedHeader: string, canonicalField: string) => {
    if (!currentFileState) return;
    
    const updatedCorrections = { ...currentFileState.headerCorrections };
    if (canonicalField) {
      updatedCorrections[detectedHeader] = canonicalField;
    } else {
      delete updatedCorrections[detectedHeader];
    }
    
    setFileStates(prev => ({
      ...prev,
      [currentFileState.file.name]: {
        ...prev[currentFileState.file.name],
        headerCorrections: updatedCorrections
      }
    }));
  };

  const handleSaveHeaderMapping = (detectedHeader: string, canonicalField: string) => {
    saveHeaderAlias(detectedHeader, canonicalField, 1.0);
    handleHeaderCorrectionChange(detectedHeader, canonicalField);
  };

  const handleTestSchedule = () => {
    if (!scheduleTestValue) return;
    const result = parseScheduleField(scheduleTestValue);
    setScheduleTestResult(result);
  };

  const handleSaveScheduleCorrection = () => {
    if (!scheduleTestResult?.isValid || !currentFileState || !scheduleTestValue) return;
    
    saveScheduleCorrection(
      scheduleTestValue,
      scheduleTestResult.days,
      scheduleTestResult.startTime,
      scheduleTestResult.endTime,
      true
    );
    
    setScheduleTestValue('');
    setScheduleTestResult(null);
  };

  const applyCorrectionsAndParse = async () => {
    if (!currentFileState) return;
    
    setLoading(true);
    
    // Save all header corrections to feedback store
    for (const [detected, canonical] of Object.entries(currentFileState.headerCorrections)) {
      saveHeaderAlias(detected, canonical, 1.0);
    }
    
    // Re-parse with corrections
    const result = parseCSV(currentFileState.content, currentFileState.file.name);
    
    // Update file state
    setFileStates(prev => ({
      ...prev,
      [currentFileState.file.name]: {
        ...prev[currentFileState.file.name],
        needsCorrection: !result.success,
        parseErrors: result.errors
      }
    }));
    
    if (result.success) {
      // Move to next file or close dialog
      if (currentFileIndex < files.length - 1) {
        setCurrentFileIndex(prev => prev + 1);
      } else {
        setCorrectionDialogOpen(false);
        // Proceed with full import
        await handleImportWithCorrections();
      }
    }
    
    setLoading(false);
  };

  const handleImportWithCorrections = async () => {
    const results: typeof parseResults = [];
    const allCourses: Course[] = [];
    const allSections: Section[] = [];
    
    for (const file of files) {
      const state = fileStates[file.name];
      if (!state) continue;
      
      const result = parseCSV(state.content, file.name);
      
      results.push({
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        filename: file.name,
      });
      
      allCourses.push(...result.courses);
      allSections.push(...result.sections);
    }
    
    setParseResults(results);
    
    if (allCourses.length > 0) {
      // Merge with existing courses
      const existing = getCourses();
      const mergedCourses = [...existing.courses, ...allCourses];
      const mergedSections = [...existing.sections, ...allSections];
      saveCourses(mergedCourses, mergedSections);
      setImported(true);
    }
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    
    // Check if any files need correction
    const needsCorrection = Object.values(fileStates).some(s => s.needsCorrection);
    if (needsCorrection) {
      handleStartCorrection();
      return;
    }
    
    setLoading(true);
    setParseResults([]);
    
    await handleImportWithCorrections();
    
    setLoading(false);
  };

  const handleLoadSample = async () => {
    setLoading(true);
    const sampleCSV = generateSampleCSV();
    const result = parseCSV(sampleCSV);
    
    if (result.success) {
      saveCourses(result.courses, result.sections);
      setParseResults([{
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        filename: 'sample_courses.csv',
      }]);
      setImported(true);
    }
    
    setLoading(false);
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files).filter(
      f => f.name.endsWith('.csv')
    );
    setFiles(prev => [...prev, ...droppedFiles]);
    
    // Trigger file analysis
    const mockEvent = { target: { files: droppedFiles as unknown as FileList } } as React.ChangeEvent<HTMLInputElement>;
    handleFileSelect(mockEvent);
  }, [handleFileSelect]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const filesNeedingCorrection = useMemo(() => 
    Object.values(fileStates).filter(s => s.needsCorrection),
    [fileStates]
  );

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
        </Box>
      </Card>

      {files.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected Files ({files.length})
            </Typography>
            <List>
              {files.map((file, index) => {
                const state = fileStates[file.name];
                const needsFix = state?.needsCorrection;
                
                return (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {needsFix ? (
                        <Tooltip title="Needs mapping correction">
                          <Warning color="warning" />
                        </Tooltip>
                      ) : (
                        <Description />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          {state?.detectedHeaders && (
                            <Chip 
                              size="small" 
                              label={`${state.detectedHeaders.length} columns`} 
                              variant="outlined"
                            />
                          )}
                          {needsFix && (
                            <Chip 
                              size="small" 
                              label="Mapping needed" 
                              color="warning"
                            />
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleRemoveFile(index)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={loading || files.length === 0}
                size="large"
                startIcon={filesNeedingCorrection.length > 0 ? <Map /> : undefined}
              >
                {loading ? <LinearProgress sx={{ width: '100%' }} /> : 
                  filesNeedingCorrection.length > 0 ? `Import with Corrections (${filesNeedingCorrection.length})` : 'Import Files'}
              </Button>
              <Button variant="outlined" onClick={handleLoadSample} disabled={loading}>
                Load Sample Data
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Correction Dialog */}
      <Dialog 
        open={correctionDialogOpen} 
        onClose={() => setCorrectionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Map />
            <span>Map CSV Headers for {currentFileState?.file.name}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {currentFileState && (
            <Stack spacing={3}>
              <Alert severity="info">
                Map the detected CSV columns to the expected fields. This mapping will be saved for future imports.
              </Alert>
              
              {/* Suggested Mappings */}
              {currentFileState.suggestedMappings.length > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Lightbulb color="primary" />
                      <Typography>Suggested Mappings ({currentFileState.suggestedMappings.length})</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {currentFileState.suggestedMappings.map(({ detected, suggested, confidence }) => (
                        <Grid key={detected}>
                          <Card variant="outlined">
                            <CardContent>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="subtitle2">{detected}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    → {CANONICAL_FIELDS.find(f => f.value === suggested)?.label || suggested}
                                  </Typography>
                                </Box>
                                <Chip 
                                  size="small" 
                                  label={`${Math.round(confidence * 100)}%`}
                                  color={confidence >= 0.9 ? 'success' : confidence >= 0.7 ? 'warning' : 'default'}
                                />
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {/* Manual Header Mapping */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight={600}>Manual Column Mapping</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {currentFileState.detectedHeaders.map(header => {
                      const currentMapping = currentFileState.suggestedMappings.find(s => s.detected === header);
                      const manualMapping = currentFileState.headerCorrections[header];
                      
                      return (
                        <Grid key={header}>
                          <FormControl fullWidth size="small">
                            <InputLabel>{header}</InputLabel>
                            <Select
                              value={manualMapping || currentMapping?.suggested || ''}
                              onChange={(e) => handleHeaderCorrectionChange(header, e.target.value)}
                              label={header}
                            >
                              <MenuItem value="">
                                <em>Not mapped</em>
                              </MenuItem>
                              {CANONICAL_FIELDS.map(field => (
                                <MenuItem key={field.value} value={field.value}>
                                  {field.label} {field.required && '*'}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      );
                    })}
                  </Grid>
                </AccordionDetails>
              </Accordion>
              
              {/* Schedule Parser Testing */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Schedule />
                    <Typography>Test Schedule Parser</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Typography variant="body2" color="text.secondary">
                      Test how combined schedule strings (e.g., "MWF 9:00-9:50") are parsed.
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Schedule string"
                        placeholder="e.g., MWF 9:00 AM - 9:50 AM"
                        value={scheduleTestValue}
                        onChange={(e) => setScheduleTestValue(e.target.value)}
                      />
                      <Button variant="outlined" onClick={handleTestSchedule}>
                        Test
                      </Button>
                    </Stack>
                    {scheduleTestResult && (
                      <Alert severity={scheduleTestResult.isValid ? 'success' : 'warning'}>
                        {scheduleTestResult.isValid ? (
                          <Stack spacing={0.5}>
                            <Typography variant="body2">
                              <strong>Days:</strong> {scheduleTestResult.days.join(', ')}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Time:</strong> {scheduleTestResult.startTime} - {scheduleTestResult.endTime}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="body2">{scheduleTestResult.error}</Typography>
                        )}
                      </Alert>
                    )}
                    {scheduleTestResult?.isValid && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Save />}
                        onClick={handleSaveScheduleCorrection}
                      >
                        Save as Correct Parse
                      </Button>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
              
              {/* Learned Aliases Display */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Learned Header Aliases</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(getHeaderAliases()).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No learned aliases yet. Map headers above to build knowledge.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {Object.entries(getHeaderAliases()).map(([alias, data]) => (
                        <Chip
                          key={alias}
                          label={`"${alias}" → ${data.canonicalHeader} (${Math.round(data.confidence * 100)}%)`}
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCorrectionDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={applyCorrectionsAndParse}
            disabled={loading}
          >
            {loading ? 'Parsing...' : currentFileIndex < files.length - 1 ? 'Next File' : 'Import All'}
          </Button>
        </DialogActions>
      </Dialog>

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
                  <Alert severity="warning">
                    {result.warnings.slice(0, 3).join(', ')}
                    {result.warnings.length > 3 && ` (+${result.warnings.length - 3} more)`}
                  </Alert>
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
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2">
            <strong>Alternative format:</strong> You can use a combined "Schedule" column instead of separate Days/Start Time/End Time columns.
            Example: <code>MWF 9:00 AM - 9:50 AM</code> or <code>TTh 14:00-15:15</code>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
