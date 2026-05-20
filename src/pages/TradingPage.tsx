import {
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Close,
  ContactPhone,
  Description,
  School,
  Search,
  SwapHoriz,
  Warning,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  IconButton,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { formatZodError, tradeSchema } from '../../db/validation';
import { EmptyState } from '../components/EmptyState';
import { useAuthContext } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import { buildTradeIndex, searchTradeIndex } from '../services/search';
import {
  createTrade,
  deleteTrade,
  getTrades as fetchTrades,
  updateTrade,
} from '../services/tradesApi';
import type { Course, Section, TradePost } from '../types';
import { timeAgo } from '../utils';
import { hasSectionConflict } from '../utils/schedule';

interface TradeConflict {
  type: 'offered' | 'wanted';
  sectionNumber: string;
  conflictingCourseCode: string;
  conflictingSectionNumber: string;
}

const TradeCard = memo(function TradeCard({
  trade,
  onUpdate,
  onDelete,
  onEdit,
  onContact,
  conflicts,
}: {
  trade: TradePost;
  onUpdate: (id: string, updates: Partial<TradePost>) => void;
  onDelete: (id: string) => void;
  onEdit: (trade: TradePost) => void;
  onContact: (phone: string) => void;
  conflicts: TradeConflict[];
}) {
  const { user } = useAuthContext();
  const isOwner = user && trade.auth0UserId === user.id;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const theme = useTheme();

  const statusConfig = {
    open: { color: 'success' as const, icon: <CheckCircle fontSize="small" /> },
    filled: { color: 'info' as const, icon: <CheckCircle fontSize="small" /> },
    cancelled: { color: 'default' as const, icon: <Close fontSize="small" /> },
  };

  return (
    <Card
      variant="outlined"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        transition: 'transform 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        opacity: trade.status === 'cancelled' ? 0.75 : 1,
        '&:hover .owner-actions': {
          opacity: 1,
          visibility: 'visible',
        },
        bgcolor: 'background.paper',
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
            }}
          >
            <Avatar
              src={trade.userAvatarUrl}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
            >
              {trade.userDisplayName[0] || 'U'}
            </Avatar>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                {trade.userDisplayName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                }}
              >
                {timeAgo(trade.createdAt)}
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            icon={statusConfig[trade.status].icon}
            label={trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
            color={statusConfig[trade.status].color}
          />
        </Stack>

        <Box
          sx={{
            display: 'inline-block',
            bgcolor: 'primary.main',
            color: 'white',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            mb: 1.5,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
            }}
          >
            {trade.courseCode}
          </Typography>
        </Box>
        {trade.courseName && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
            }}
          >
            {trade.courseName}
          </Typography>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Chip
            icon={<ArrowForward />}
            label={`Has: ${trade.sectionOffered}`}
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<ArrowBack />}
            label={`Wants: ${trade.sectionWanted}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>

        {conflicts.length > 0 && (
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {conflicts.map((conflict, idx) => (
              <Tooltip
                key={idx}
                title={
                  conflict.type === 'offered'
                    ? `Your ${conflict.sectionNumber} conflicts with ${conflict.conflictingCourseCode} (${conflict.conflictingSectionNumber})`
                    : `Wanted section ${conflict.sectionNumber} conflicts with ${conflict.conflictingCourseCode} (${conflict.conflictingSectionNumber})`
                }
              >
                <Chip
                  icon={<Warning fontSize="small" />}
                  size="small"
                  label={
                    conflict.type === 'offered'
                      ? `Has: conflicts with ${conflict.conflictingCourseCode}`
                      : `Wants: conflicts with ${conflict.conflictingCourseCode}`
                  }
                  color="error"
                  variant="outlined"
                  sx={{
                    alignSelf: 'flex-start',
                    fontWeight: 500,
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        )}

        {trade.description && (
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {trade.description}
          </Typography>
        )}

        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1}>
            {!isOwner && (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<ContactPhone />}
                onClick={() => onContact(trade.contactPhone)}
              >
                Contact
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
      {isOwner && (
        <Box
          className="owner-actions"
          sx={{
            opacity: isHovered ? 1 : 0,
            visibility: isHovered ? 'visible' : 'hidden',
            transition: 'opacity 0.2s ease, visibility 0.2s ease',
            bgcolor: alpha(theme.palette.action.hover, 0.5),
            py: 1,
            px: 2,
            display: 'flex',
            gap: 1,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <Button size="small" onClick={() => onEdit(trade)}>
            Edit
          </Button>
          {trade.status === 'open' && (
            <Button size="small" onClick={() => onUpdate(trade.id, { status: 'filled' })}>
              Mark as Filled
            </Button>
          )}
          <Button size="small" color="error" onClick={() => setConfirmDeleteOpen(true)}>
            Delete
          </Button>
        </Box>
      )}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete Trade?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this trade for {trade.courseCode}? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              setConfirmDeleteOpen(false);
              onDelete(trade.id);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
});

export default function TradingPage() {
  const { user, getToken, profile } = useAuthContext();

  const [trades, setTrades] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingTrade, setEditingTrade] = useState<TradePost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);

  const [tradeForm, setTradeForm] = useState({
    courseCode: '',
    courseName: '',
    sectionOffered: '',
    sectionWanted: '',
    description: '',
  });

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await fetchTrades(token);
      setTrades(result);
      buildTradeIndex(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const loadSemesterData = useCallback(async () => {
    try {
      const { getSemesters } = await import('../services/coursesApi');
      const { semesters } = await getSemesters();
      if (!semesters || semesters.length === 0) return;

      const activeSemester = semesters.find((s) => s.isActive) || semesters[0];
      const { getCachedSemesterData, cacheSemesterData } = await import('../services/dbCache');
      const { transformSections } = await import('../utils/semester-transform');

      const cachedData = await getCachedSemesterData(activeSemester.id);
      if (cachedData?.courses && cachedData.sections) {
        setAllCourses(cachedData.courses);
        setAllSections(cachedData.sections);
      } else {
        const response = await fetch(activeSemester.jsonUrl);
        if (!response.ok) return;
        const semesterData = await response.json();
        const { courses, sections } = transformSections(semesterData.sections);
        await cacheSemesterData(activeSemester.id, courses, sections);
        setAllCourses(courses);
        setAllSections(sections);
      }
    } catch (e) {
      console.error('Failed to load semester data:', e);
    }
  }, []);

  useEffect(() => {
    loadTrades();
    loadSemesterData();
  }, [loadTrades, loadSemesterData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = useCallback((trade: TradePost) => {
    setEditingTrade(trade);
    setTradeForm({
      courseCode: trade.courseCode,
      courseName: trade.courseName || '',
      sectionOffered: trade.sectionOffered,
      sectionWanted: trade.sectionWanted,
      description: trade.description || '',
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const validatedData = tradeSchema.parse({
        ...tradeForm,
        courseName: tradeForm.courseName || undefined,
        description: tradeForm.description || undefined,
      });

      const token = await getToken();

      if (editingTrade) {
        await updateTrade(token, editingTrade.id, validatedData);
      } else {
        await createTrade(token, validatedData);
      }

      setDialogOpen(false);
      setEditingTrade(null);
      setTradeForm({
        courseCode: '',
        courseName: '',
        sectionOffered: '',
        sectionWanted: '',
        description: '',
      });
      await loadTrades();
      setSnackbar({ open: true, message: 'Trade posted successfully!' });
    } catch (e) {
      if (e instanceof Error && e.constructor.name === 'ZodError') {
        const zodError = e as import('zod').ZodError;
        const formatted = formatZodError(zodError);
        setError(formatted.details.map((d) => `${d.field}: ${d.message}`).join('. '));
      } else if (e instanceof ApiError && e.details) {
        setError(e.details.map((d) => `${d.field}: ${d.message}`).join('. '));
      } else {
        setError((e as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleContact = useCallback(async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setSnackbar({ open: true, message: 'Phone number copied to clipboard!' });
    } catch {
      setSnackbar({ open: true, message: `Phone: ${phone}` });
    }
  }, []);

  const handleUpdate = useCallback(
    async (id: string, updates: Partial<TradePost>) => {
      try {
        const token = await getToken();
        const updated = await updateTrade(token, id, updates);
        setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch (e) {
        if (e instanceof ApiError && e.details) {
          const messages = e.details.map((d) => `${d.field}: ${d.message}`).join('\n');
          setError(`Validation failed:\n${messages}`);
        } else {
          setError((e as Error).message);
        }
      }
    },
    [getToken],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const token = await getToken();
        await deleteTrade(token, id);
        setTrades((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        if (e instanceof ApiError && e.details) {
          setError(e.details.map((d) => `${d.field}: ${d.message}`).join('. '));
        } else {
          setError((e as Error).message);
        }
      }
    },
    [getToken],
  );

  const selectedSections = useMemo(() => {
    if (!profile?.courseSelections || !allSections.length) return [];
    const sectionMap = new Map(allSections.map((s) => [s.id, s]));
    return Object.values(profile.courseSelections)
      .map((id) => sectionMap.get(id))
      .filter((s): s is Section => !!s);
  }, [profile?.courseSelections, allSections]);

  const tradeConflictsMap = useMemo(() => {
    const map = new Map<string, TradeConflict[]>();
    if (!selectedSections.length || !allSections.length) return map;

    const courseSectionsMap = new Map<string, Section[]>();
    for (const section of allSections) {
      const existing = courseSectionsMap.get(section.courseId) || [];
      existing.push(section);
      courseSectionsMap.set(section.courseId, existing);
    }

    for (const trade of trades) {
      const conflicts: TradeConflict[] = [];
      const courseSections = courseSectionsMap.get(trade.courseCode) || [];

      const offeredSection = courseSections.find((s) => s.sectionNumber === trade.sectionOffered);
      const wantedSection = courseSections.find((s) => s.sectionNumber === trade.sectionWanted);

      for (const selected of selectedSections) {
        if (offeredSection && hasSectionConflict(offeredSection, selected)) {
          const selCourse = allCourses.find((c) => c.id === selected.courseId);
          conflicts.push({
            type: 'offered',
            sectionNumber: trade.sectionOffered,
            conflictingCourseCode: selCourse?.code || selected.courseId,
            conflictingSectionNumber: selected.sectionNumber,
          });
        }
        if (wantedSection && hasSectionConflict(wantedSection, selected)) {
          const selCourse = allCourses.find((c) => c.id === selected.courseId);
          conflicts.push({
            type: 'wanted',
            sectionNumber: trade.sectionWanted,
            conflictingCourseCode: selCourse?.code || selected.courseId,
            conflictingSectionNumber: selected.sectionNumber,
          });
        }
      }

      map.set(trade.id, conflicts);
    }

    return map;
  }, [trades, selectedSections, allSections, allCourses]);

  const filteredTrades = useMemo(() => {
    return searchTradeIndex(debouncedSearch);
  }, [debouncedSearch]);

  if (loading) {
    return (
      <Box>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
          }}
        >
          <Typography variant="h4">Course Trading</Typography>
        </Stack>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="outlined">
              <CardContent>
                <Stack
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="text" width={80} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rounded" width={60} height={24} />
                    <Skeleton variant="rounded" width={60} height={24} />
                  </Stack>
                </Stack>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="60%" />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    mt: 2,
                  }}
                >
                  <Skeleton variant="rounded" width={100} height={24} />
                  <Skeleton variant="rounded" width={100} height={24} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4">Course Trading</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={loadTrades} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SwapHoriz />}
            onClick={() => setDialogOpen(true)}
          >
            Post Trade
          </Button>
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {trades.length === 0 && !loading ? (
        <EmptyState
          icon={<SwapHoriz />}
          title="No Trades Yet"
          description="Find the perfect section swap — post your first trade."
          action={
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SwapHoriz />}
              onClick={() => setDialogOpen(true)}
            >
              Post Trade
            </Button>
          }
        />
      ) : (
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
          <TextField
            placeholder="Search trades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            aria-label="Search trades"
            slotProps={{
              input: {
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: (
                  <InputAdornment position="end">
                    {search && (
                      <Tooltip title="Clear search">
                        <IconButton
                          size="small"
                          onClick={() => setSearch('')}
                          aria-label="Clear search"
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </InputAdornment>
                ),
              },
            }}
          />

          <Typography variant="h6">
            {filteredTrades.length} Trade{filteredTrades.length !== 1 ? 's' : ''}
          </Typography>

          {filteredTrades.length === 0 ? (
            <EmptyState
              icon={<SwapHoriz />}
              title="No Trades Found"
              description="Try adjusting your search or post a new trade."
            />
          ) : (
            <Virtuoso
              data={filteredTrades}
              overscan={3}
              itemContent={(_index, trade) => (
                <Box sx={{ pb: 1 }}>
                  <TradeCard
                    trade={trade}
                    conflicts={tradeConflictsMap.get(trade.id) || []}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onContact={handleContact}
                  />
                </Box>
              )}
              style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
            />
          )}
        </Stack>
      )}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTrade(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingTrade ? 'Edit Trade' : 'Post a Trade'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Course Details
              </Typography>
              <TextField
                label="Course Code"
                placeholder="e.g., CS 301"
                value={tradeForm.courseCode}
                onChange={(e) => setTradeForm({ ...tradeForm, courseCode: e.target.value })}
                fullWidth
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <School fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                helperText="Enter the course code (e.g., CS 301)"
              />
              <TextField
                label="Course Name"
                placeholder="e.g., Data Structures"
                value={tradeForm.courseName}
                onChange={(e) => setTradeForm({ ...tradeForm, courseName: e.target.value })}
                fullWidth
                sx={{ mt: 1.5 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <School fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                color="primary"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                Trade Details
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Section You Have"
                  placeholder="e.g., A1"
                  value={tradeForm.sectionOffered}
                  onChange={(e) => setTradeForm({ ...tradeForm, sectionOffered: e.target.value })}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <ArrowForward fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText="Your section"
                />
                <TextField
                  label="Section You Want"
                  placeholder="e.g., A2"
                  value={tradeForm.sectionWanted}
                  onChange={(e) => setTradeForm({ ...tradeForm, sectionWanted: e.target.value })}
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <ArrowBack fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText="Desired section"
                />
              </Stack>
            </Box>

            <TextField
              label="Description"
              placeholder="Any additional details about your trade..."
              value={tradeForm.description}
              onChange={(e) => setTradeForm({ ...tradeForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setEditingTrade(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !tradeForm.courseCode ||
              !tradeForm.sectionOffered ||
              !tradeForm.sectionWanted ||
              submitting
            }
            loading={submitting}
          >
            {editingTrade ? 'Save Changes' : 'Post Trade'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
