import { useCallback, useState, useMemo, useEffect } from 'react';
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
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  Collapse,
} from '@mui/material';
import {
  Upload,
  Description,
  Delete,
  CheckCircle,
  Warning,
  CloudUpload,
  Lightbulb,
  Save,
  Map,
  Schedule,
  Preview,
  Check,
  Error,
  ArrowForward,
  ArrowBack,
  Visibility,
} from '@mui/icons-material';
import { parseCSV, generateSampleCSV, generateCSVPreview, getHeaderMappingSuggestions, getHeaderAliases } from '../utils/csv';
import { parseScheduleField, parseComplexSchedule, createCustomScheduleParser } from '../constants/csvHeaders';
import { saveCourses, getCourses } from '../services/database';
import { saveHeaderAlias, saveScheduleCorrection, saveCustomScheduleFormat, getCustomScheduleFormats, learnSchedulePattern } from '../services/feedback';
import { useNavigate } from 'react-router-dom';
import type { Course, Section, CSVPreviewResult, HeaderMappingSuggestion, PreviewRow } from '../types';

interface FileAnalysisState {
  file: File;
  content: string;
  preview: CSVPreviewResult | null;
  suggestions: HeaderMappingSuggestion[];
  customMappings: Record<string, string>;
  isAnalyzing: boolean;
}

const CANONICAL_FIELDS = [
  { value: 'courseCode', label: 'Course Code', required: true, icon: '🔢' },
  { value: 'courseName', label: 'Course Name', required: true, icon: '📚' },
  { value: 'subject', label: 'Subject', required: true, icon: '📖' },
  { value: 'sectionNumber', label: 'Section', required: true, icon: '🔢' },
  { value: 'instructor', label: 'Instructor', required: true, icon: '👨‍🏫' },
  { value: 'days', label: 'Days', required: false, icon: '📅' },
  { value: 'startTime', label: 'Start Time', required: false, icon: '🕐' },
  { value: 'endTime', label: 'End Time', required: false, icon: '🕐' },
  { value: 'schedule', label: 'Schedule (Combined)', required: false, icon: '📅' },
  { value: 'location', label: 'Location', required: true, icon: '📍' },
  { value: 'credits', label: 'Credits', required: true, icon: '⭐' },
  { value: 'term', label: 'Term', required: false, icon: '📆' },
];

const FIELD_COLORS: Record<string, string> = {
  courseCode: '#1976d2',
  courseName: '#388e3c',
  subject: '#7b1fa2',
  sectionNumber: '#d32f2f',
  instructor: '#ed6c02',
  days: '#0288d1',
  startTime: '#689f38',
  endTime: '#f57c00',
  schedule: '#00796b',
  location: '#5d4037',
  credits: '#c62828',
  term: '#455a64',
};

function getConfidenceColor(confidence: string): 'success' | 'warning' | 'error' | 'default' {
  switch (confidence) {
    case 'high': return 'success';
    case 'medium': return 'warning';
    case 'low': return 'error';
    default: return 'default';
  }
}

function getConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'None';
  }
}

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileAnalyses, setFileAnalyses] = useState<Record<string, FileAnalysisState>>({});
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [parseResults, setParseResults] = useState<{
    courses: Course[];
    sections: Section[];
    errors: string[];
    warnings: string[];
    filename: string;
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleTestValue, setScheduleTestValue] = useState('');
  const [scheduleTestResult, setScheduleTestResult] = useState<ReturnType<typeof parseScheduleField> | null>(null);
  const [complexScheduleResult, setComplexScheduleResult] = useState<ReturnType<typeof parseComplexSchedule> | null>(null);
  const [showCustomFormatBuilder, setShowCustomFormatBuilder] = useState(false);
  const [customSeparator, setCustomSeparator] = useState('Section');
  const [customPattern, setCustomPattern] = useState('');
  const [customFormatName, setCustomFormatName] = useState('');
  const [savedFormats, setSavedFormats] = useState(getCustomScheduleFormats());
  const navigate = useNavigate();

  const activeFile = files[activeFileIndex];
  const activeAnalysis = activeFile ? fileAnalyses[activeFile.name] : null;

  // Analyze file when selected
  const analyzeFile = useCallback(async (file: File) => {
    setFileAnalyses(prev => ({
      ...prev,
      [file.name]: { ...prev[file.name], isAnalyzing: true }
    }));

    try {
      const content = await file.text();
      const suggestions = getHeaderMappingSuggestions(detectCSVHeaders(content));
      
      // Build initial custom mappings from high-confidence suggestions
      const initialMappings: Record<string, string> = {};
      suggestions.forEach(s => {
        if (s.confidence === 'high') {
          initialMappings[s.header] = s.suggestedField;
        }
      });

      const preview = generateCSVPreview(content, initialMappings);

      setFileAnalyses(prev => ({
        ...prev,
        [file.name]: {
          file,
          content,
          preview,
          suggestions,
          customMappings: initialMappings,
          isAnalyzing: false,
        }
      }));
    } catch (error) {
      console.error(`Failed to analyze ${file.name}:`, error);
      setFileAnalyses(prev => ({
        ...prev,
        [file.name]: { ...prev[file.name], isAnalyzing: false }
      }));
    }
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Analyze each new file
      for (const file of newFiles) {
        await analyzeFile(file);
      }
    }
  }, [analyzeFile]);

  const handleRemoveFile = (index: number) => {
    const file = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileAnalyses(prev => {
      const { [file.name]: _, ...rest } = prev;
      return rest;
    });
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(prev => prev - 1);
    }
  };

  const handleMappingChange = (header: string, field: string) => {
    if (!activeAnalysis) return;

    const newMappings = { ...activeAnalysis.customMappings };
    if (field) {
      newMappings[header] = field;
    } else {
      delete newMappings[header];
    }

    // Regenerate preview with new mappings
    const newPreview = generateCSVPreview(activeAnalysis.content, newMappings);

    setFileAnalyses(prev => ({
      ...prev,
      [activeFile.name]: {
        ...prev[activeFile.name],
        customMappings: newMappings,
        preview: newPreview,
      }
    }));

    // Save to feedback store
    if (field) {
      saveHeaderAlias(header, field, 1.0);
    }
  };

  const handleTestSchedule = () => {
    if (!scheduleTestValue) return;
    const result = parseScheduleField(scheduleTestValue);
    setScheduleTestResult(result);
    
    // Also try complex parsing
    const complexResult = parseComplexSchedule(scheduleTestValue);
    setComplexScheduleResult(complexResult);
  };

  const handleSaveScheduleCorrection = () => {
    if (!scheduleTestResult?.isValid || !scheduleTestValue) return;
    
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

  const handleTestCustomFormat = () => {
    if (!scheduleTestValue || !customSeparator) return;
    
    try {
      const parser = createCustomScheduleParser(
        customSeparator,
        new RegExp(customPattern, 'gi')
      );
      const result = parser(scheduleTestValue);
      setComplexScheduleResult(result);
    } catch (err) {
      setComplexScheduleResult({
        timeSlots: [],
        isValid: false,
        error: 'Invalid pattern or separator'
      });
    }
  };

  const handleSaveCustomFormat = () => {
    if (!customFormatName || !customSeparator) return;
    
    const format = {
      id: Math.random().toString(36).substring(2, 15),
      name: customFormatName,
      description: `Separator: "${customSeparator}", Pattern: "${customPattern}"`,
      separator: customSeparator,
      pattern: customPattern,
      example: scheduleTestValue.slice(0, 100) + '...',
      extractTimeSlots: () => []
    };
    
    saveCustomScheduleFormat(format);
    setSavedFormats(getCustomScheduleFormats());
    
    // Also save to feedback
    learnSchedulePattern(scheduleTestValue, customSeparator, customPattern, customFormatName);
    
    setCustomFormatName('');
  };

  const handleImport = async () => {
    const readyFiles = Object.values(fileAnalyses).filter(a => a.preview?.canImport);
    if (readyFiles.length === 0) {
      setShowPreview(true);
      return;
    }

    setLoading(true);
    const results: typeof parseResults = [];
    const allCourses: Course[] = [];
    const allSections: Section[] = [];

    for (const analysis of readyFiles) {
      const result = parseCSV(analysis.content, analysis.file.name);
      
      results.push({
        courses: result.courses,
        sections: result.sections,
        errors: result.errors,
        warnings: result.warnings,
        filename: analysis.file.name,
      });
      
      allCourses.push(...result.courses);
      allSections.push(...result.sections);
    }

    setParseResults(results);
    
    if (allCourses.length > 0) {
      const existing = getCourses();
      saveCourses([...existing.courses, ...allCourses], [...existing.sections, ...allSections]);
      setImported(true);
    }

    setLoading(false);
    setShowPreview(false);
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
    droppedFiles.forEach(file => analyzeFile(file));
  }, [analyzeFile]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const allFilesReady = useMemo(() => {
    return Object.values(fileAnalyses).every(a => a.preview?.canImport);
  }, [fileAnalyses]);

  const readyFilesCount = useMemo(() => {
    return Object.values(fileAnalyses).filter(a => a.preview?.canImport).length;
  }, [fileAnalyses]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={700}>
        Import Courses
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload CSV files and preview how they'll be imported
      </Typography>

      {/* Upload Area */}
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

      {/* Files List */}
      {files.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Files ({files.length})
              </Typography>
              {readyFilesCount > 0 && (
                <Chip 
                  icon={<CheckCircle />}
                  label={`${readyFilesCount} ready to import`}
                  color="success"
                  size="small"
                />
              )}
            </Stack>

            <List>
              {files.map((file, index) => {
                const analysis = fileAnalyses[file.name];
                const isReady = analysis?.preview?.canImport;
                const hasIssues = analysis?.preview && !analysis.preview.canImport;
                
                return (
                  <ListItem 
                    key={index}
                    onClick={() => setActiveFileIndex(index)}
                    sx={{ 
                      cursor: 'pointer', 
                      borderRadius: 1,
                      bgcolor: activeFileIndex === index ? 'action.selected' : 'inherit'
                    }}
                  >
                    <ListItemIcon>
                      {analysis?.isAnalyzing ? (
                        <Box sx={{ width: 20 }}>
                          <LinearProgress />
                        </Box>
                      ) : isReady ? (
                        <CheckCircle color="success" />
                      ) : hasIssues ? (
                        <Tooltip title="Needs attention">
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
                          {analysis?.preview && (
                            <>
                              <Chip 
                                size="small" 
                                label={`${analysis.preview.headers.length} columns`}
                                variant="outlined"
                              />
                              <Chip 
                                size="small"
                                label={`${analysis.preview.rows.filter(r => r.isValid).length}/${analysis.preview.rows.length} rows valid`}
                                color={isReady ? 'success' : hasIssues ? 'warning' : 'default'}
                                variant="outlined"
                              />
                            </>
                          )}
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => handleRemoveFile(index)} size="small">
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
                onClick={allFilesReady ? handleImport : () => setShowPreview(true)}
                disabled={loading || files.length === 0 || Object.keys(fileAnalyses).length === 0}
                size="large"
                startIcon={allFilesReady ? <CheckCircle /> : <Visibility />}
              >
                {loading ? <LinearProgress sx={{ width: '100%' }} /> : 
                  allFilesReady ? `Import ${readyFilesCount} File${readyFilesCount > 1 ? 's' : ''}` : 'Review & Map'}
              </Button>
              <Button variant="outlined" onClick={handleLoadSample} disabled={loading}>
                Load Sample
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Live Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="xl"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Preview color="primary" />
            <Box>
              <Typography variant="h6">Preview & Map Headers</Typography>
              <Typography variant="caption" color="text.secondary">
                {activeFile?.name}
              </Typography>
            </Box>
            {activeAnalysis?.preview && (
              <Chip
                size="small"
                icon={activeAnalysis.preview.canImport ? <CheckCircle /> : <Warning />}
                label={activeAnalysis.preview.canImport ? 'Ready to import' : 'Needs mapping'}
                color={activeAnalysis.preview.canImport ? 'success' : 'warning'}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {activeAnalysis?.preview && (
            <Stack spacing={3}>
              {/* Required Fields Status */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Required Fields
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {Object.entries(activeAnalysis.preview.requiredFieldsPresent)
                      .filter(([key]) => key !== 'timeInfo')
                      .map(([field, present]) => {
                        const fieldInfo = CANONICAL_FIELDS.find(f => f.value === field);
                        return (
                          <Chip
                            key={field}
                            size="small"
                            icon={present ? <Check /> : <Error />}
                            label={fieldInfo?.label || field}
                            color={present ? 'success' : 'error'}
                            variant={present ? 'filled' : 'outlined'}
                          />
                        );
                      })}
                    <Chip
                      size="small"
                      icon={activeAnalysis.preview.requiredFieldsPresent.timeInfo ? <Check /> : <Error />}
                      label="Time Info"
                      color={activeAnalysis.preview.requiredFieldsPresent.timeInfo ? 'success' : 'error'}
                      variant={activeAnalysis.preview.requiredFieldsPresent.timeInfo ? 'filled' : 'outlined'}
                    />
                  </Stack>
                </CardContent>
              </Card>

              {/* Header Mapping Section */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Map CSV Headers
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Select the correct field for each detected header. High confidence matches are pre-selected.
                  </Typography>

                  <Grid container spacing={2}>
                    {activeAnalysis.suggestions.map((suggestion) => {
                      const currentValue = activeAnalysis.customMappings[suggestion.header] || '';
                      const isMapped = !!currentValue;
                      
                      return (
                        <Grid key={suggestion.header}>
                          <Card 
                            variant="outlined" 
                            sx={{ 
                              borderColor: isMapped ? FIELD_COLORS[currentValue] : 'divider',
                              borderWidth: isMapped ? 2 : 1,
                            }}
                          >
                            <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                              <Stack spacing={1}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    {suggestion.header}
                                  </Typography>
                                  <Tooltip title={suggestion.reason}>
                                    <Chip
                                      size="small"
                                      label={getConfidenceLabel(suggestion.confidence)}
                                      color={getConfidenceColor(suggestion.confidence)}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                </Stack>
                                
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={currentValue}
                                    onChange={(e) => handleMappingChange(suggestion.header, e.target.value)}
                                    displayEmpty
                                    renderValue={(selected) => {
                                      if (!selected) return <em>Select field...</em>;
                                      const field = CANONICAL_FIELDS.find(f => f.value === selected);
                                      return (
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                          <span>{field?.icon}</span>
                                          <span>{field?.label}</span>
                                        </Stack>
                                      );
                                    }}
                                  >
                                    <MenuItem value="">
                                      <em>Not mapped</em>
                                    </MenuItem>
                                    {CANONICAL_FIELDS.map(field => (
                                      <MenuItem key={field.value} value={field.value}>
                                        <Stack direction="row" alignItems="center" spacing={1} width="100%">
                                          <span>{field.icon}</span>
                                          <span>{field.label}</span>
                                          {field.required && (
                                            <Chip size="small" label="Required" color="primary" sx={{ ml: 'auto' }} />
                                          )}
                                        </Stack>
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>

                                {suggestion.alternatives.length > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    Also similar to: {suggestion.alternatives.join(', ')}
                                  </Typography>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>

              {/* Preview Table */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Preview (First {activeAnalysis.preview.rows.length} rows)
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell width={50}>#</TableCell>
                          <TableCell width={100}>Status</TableCell>
                          {activeAnalysis.preview.headers.map(header => {
                            const mappedField = activeAnalysis.preview?.mappings[header];
                            const fieldInfo = CANONICAL_FIELDS.find(f => f.value === mappedField);
                            return (
                              <TableCell key={header}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <span>{fieldInfo?.icon}</span>
                                  <span>{fieldInfo?.label || header}</span>
                                  {mappedField && (
                                    <Chip 
                                      size="small" 
                                      label={header}
                                      variant="outlined"
                                      sx={{ fontSize: '0.6rem' }}
                                    />
                                  )}
                                </Stack>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeAnalysis.preview.rows.map((row) => (
                          <TableRow 
                            key={row.rowNumber}
                            sx={{ 
                              bgcolor: row.isValid ? 'inherit' : 'error.light',
                              '&:hover': { bgcolor: row.isValid ? 'action.hover' : 'error.light' }
                            }}
                          >
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>
                              {row.isValid ? (
                                <CheckCircle color="success" fontSize="small" />
                              ) : (
                                <Tooltip title={row.errors.join(', ')}>
                                  <Error color="error" fontSize="small" />
                                </Tooltip>
                              )}
                            </TableCell>
                            {activeAnalysis.preview?.headers.map(header => {
                              const mappedField = activeAnalysis.preview?.mappings[header];
                              const rawValue = row.rawData[header];
                              const parsedValue = mappedField ? getParsedValue(row, mappedField) : null;
                              
                              return (
                                <TableCell key={header}>
                                  <Tooltip 
                                    title={
                                      parsedValue && parsedValue !== rawValue 
                                        ? `Raw: ${rawValue}` 
                                        : ''
                                    }
                                  >
                                    <span>
                                      {parsedValue || rawValue || '-'}
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Schedule Parser Test */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    <Schedule sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Schedule Parser Test
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Test how combined schedule strings (e.g., "MWF 9:00-9:50") will be parsed
                  </Typography>
                  
                  <Stack direction="row" spacing={2} alignItems="flex-start">
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
                    <Alert 
                      severity={scheduleTestResult.isValid ? 'success' : 'warning'}
                      sx={{ mt: 2 }}
                      action={
                        scheduleTestResult.isValid && (
                          <Button 
                            size="small" 
                            startIcon={<Save />}
                            onClick={handleSaveScheduleCorrection}
                          >
                            Save
                          </Button>
                        )
                      }
                    >
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
                </CardContent>
              </Card>

              {/* Complex Schedule Parser */}
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">
                      <Schedule sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Complex Schedule Parser
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setShowCustomFormatBuilder(!showCustomFormatBuilder)}
                    >
                      {showCustomFormatBuilder ? 'Hide' : 'Custom Format'}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    Parse schedules with multiple time slots, dates, and sections
                    <br />
                    Example: "Section 1 Tue [15:00 to 16:00] [04-08-2025 to 23-11-2025]..."
                  </Typography>

                  {complexScheduleResult && complexScheduleResult.timeSlots.length > 0 && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Found {complexScheduleResult.timeSlots.length} time slot(s):
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {complexScheduleResult.timeSlots[0]?.section && <TableCell>Section</TableCell>}
                              <TableCell>Day</TableCell>
                              <TableCell>Time</TableCell>
                              {complexScheduleResult.timeSlots.some(s => s.startDate) && <TableCell>Dates</TableCell>}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {complexScheduleResult.timeSlots.map((slot, idx) => (
                              <TableRow key={idx}>
                                {slot.section && <TableCell>{slot.section}</TableCell>}
                                <TableCell>{slot.day}</TableCell>
                                <TableCell>{slot.startTime} - {slot.endTime}</TableCell>
                                {slot.startDate && (
                                  <TableCell>{slot.startDate} to {slot.endDate}</TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Alert>
                  )}

                  <Collapse in={showCustomFormatBuilder}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Custom Format Builder
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Define how to split and parse complex schedule strings
                      </Typography>

                      <Stack spacing={2}>
                        <TextField
                          size="small"
                          label="Separator (e.g., 'Section', 'Day', '|')"
                          value={customSeparator}
                          onChange={(e) => setCustomSeparator(e.target.value)}
                          helperText="Text that separates different time slot groups"
                        />
                        <TextField
                          size="small"
                          label="Pattern (Regex) - Optional"
                          value={customPattern}
                          onChange={(e) => setCustomPattern(e.target.value)}
                          placeholder="e.g., (\\w+)\\s*\\[(\\d+:\\d+)\\s*to\\s*(\\d+:\\d+)\\]"
                          helperText="Regex pattern with capture groups for: day, start time, end time"
                        />
                        <Stack direction="row" spacing={2}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={handleTestCustomFormat}
                            disabled={!scheduleTestValue}
                          >
                            Test Custom Format
                          </Button>
                        </Stack>

                        {complexScheduleResult?.isValid && (
                          <Stack direction="row" spacing={2} alignItems="center">
                            <TextField
                              size="small"
                              label="Format name"
                              value={customFormatName}
                              onChange={(e) => setCustomFormatName(e.target.value)}
                              placeholder="e.g., My University Format"
                            />
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Save />}
                              onClick={handleSaveCustomFormat}
                              disabled={!customFormatName}
                            >
                              Save Format
                            </Button>
                          </Stack>
                        )}
                      </Stack>

                      {/* Saved Formats */}
                      {Object.keys(savedFormats).length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" fontWeight={600}>
                            Saved Formats:
                          </Typography>
                          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                            {Object.values(savedFormats).map((format) => (
                              <Chip
                                key={format.id}
                                label={format.name}
                                onClick={() => {
                                  setCustomSeparator(format.separator);
                                  setCustomPattern(format.pattern);
                                }}
                                onDelete={() => {
                                  // Would need delete function
                                }}
                                size="small"
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!activeAnalysis?.preview?.canImport || loading}
            startIcon={<CheckCircle />}
          >
            Import This File
          </Button>
        </DialogActions>
      </Dialog>

      {/* Results */}
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
          Courses imported successfully!
        </Alert>
      )}
    </Box>
  );
}

// Helper function to get parsed value for display
function getParsedValue(row: PreviewRow, field: string): string | null {
  const value = row.parsedData[field as keyof typeof row.parsedData];
  if (!value) return null;
  
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

// Helper to detect headers
function detectCSVHeaders(csvContent: string): string[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];
  
  const headerLine = lines[0].trim();
  if (!headerLine) return [];
  
  // Simple CSV parsing for headers
  const headers: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of headerLine) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  headers.push(current.trim());
  
  return headers;
}
