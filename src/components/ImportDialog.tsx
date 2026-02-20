import { useCallback, useState } from 'react';
import {
  Box,
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
} from '@mui/material';
import {
  Upload,
  Support,
  Description,
  Delete,
  CheckCircle,
  Warning,
  CloudUpload,
  Close,
} from '@mui/icons-material';
import { parseCSV } from '../utils/csv';
import { saveCourses } from '../config/storageConfig';
import { useNavigate } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';
import type { Course, Section } from '../types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportDialog({ open, onClose }: ImportDialogProps) {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleClose = () => {
    if (!loading) {
      setFiles([]);
      setParseResults([]);
      setImported(false);
      onClose();
    }
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const handleConfirmRemoveFile = (index: number) => {
    setFileToDelete(index);
    setDeleteDialogOpen(true);
  };

  const handleRemoveFile = () => {
    if (fileToDelete !== null) {
      setFiles((prev) => prev.filter((_, i) => i !== fileToDelete));
    }
    setDeleteDialogOpen(false);
    setFileToDelete(null);
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
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          Import Courses
          <IconButton onClick={handleClose} disabled={loading} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, p: 1, borderRadius: 1, borderColor: 'secondary.light', border: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Supported CSV Formats - Most of Ahmedabad University format
            </Typography>
            <Button
              href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
              variant="contained"
              component="label"
              startIcon={<Support />}
              size="small"
            >
              {' '}
              Still need help?
            </Button>
          </Box>

          <Box
            sx={{
              mb: 2,
              p: 2,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
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
                py: 2,
              }}
            >
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                Drag and drop CSV files here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                or click to browse (multiple files allowed)
              </Typography>
              <Button variant="contained" component="label" startIcon={<Upload />} size="small">
                Select Files
                <input type="file" accept=".csv" multiple hidden onChange={handleFileSelect} />
              </Button>
            </Box>
          </Box>

          {files.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files ({files.length})
              </Typography>
              <List dense>
                {files.map((file, index) => (
                  <ListItem key={index}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Description fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(1)} KB`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleConfirmRemoveFile(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {parseResults.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Import Results
              </Typography>
              {parseResults.map((result, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    {result.errors.length > 0 ? (
                      <Warning color="error" fontSize="small" />
                    ) : (
                      <CheckCircle color="success" fontSize="small" />
                    )}
                    <Typography variant="body2" fontWeight={600}>
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
                    <Alert severity="error" sx={{ mb: 0.5 }}>
                      {result.errors.join(', ')}
                    </Alert>
                  )}

                  {result.warnings.length > 0 && (
                    <Alert severity="warning">{result.warnings.join(', ')}</Alert>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {imported && (
            <Alert
              severity="success"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    handleClose();
                    navigate('/courses');
                  }}
                >
                  Browse Courses
                </Button>
              }
            >
              Courses imported successfully!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            {imported ? 'Done' : 'Cancel'}
          </Button>
          {!imported && (
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={loading || files.length === 0}
              startIcon={loading ? undefined : <Upload />}
            >
              {loading ? <LinearProgress sx={{ width: 100 }} /> : 'Import'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Remove File?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove {fileToDelete !== null ? files[fileToDelete]?.name : ''}
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleRemoveFile}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
