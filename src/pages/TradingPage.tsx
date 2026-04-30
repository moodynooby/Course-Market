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
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  createTrade,
  deleteTrade,
  getTrades as fetchTrades,
  updateTrade,
} from '../services/tradesApi';
import { ApiError } from '../services/apiClient';
import type { TradePost } from '../types';
import { timeAgo } from '../utils';
import { tradeSchema, formatZodError } from '../lib/schemas';
import { useNotification } from '../hooks/useNotification';
import { EmptyState } from '../components/EmptyState';

const TradeCard = memo(function TradeCard({
  trade,
  onUpdate,
  onDelete,
  onEdit,
  onContact,
}: {
  trade: TradePost;
  onUpdate: (id: string, updates: Partial<TradePost>) => void;
  onDelete: (id: string) => void;
  onEdit: (trade: TradePost) => void;
  onContact: (phone: string) => void;
}) {
  const { user } = useAuth();
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered ? 4 : 'none',
        opacity: trade.status === 'cancelled' ? 0.75 : 1,
        '&:hover .owner-actions': {
          opacity: 1,
          visibility: 'visible',
        },
        bgcolor: 'surface.containerHighest',
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              src={trade.userAvatarUrl}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
            >
              {trade.userDisplayName[0] || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {trade.userDisplayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
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
          <Typography variant="subtitle2" fontWeight={600}>
            {trade.courseCode}
          </Typography>
        </Box>
        {trade.courseName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {trade.courseName}
          </Typography>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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

        {trade.description && (
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            {trade.description}
          </Typography>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            {!isOwner && (
              <Button
                size="small"
                variant="contained"
                color="accent"
                startIcon={<ContactPhone />}
                onClick={() => onContact(trade.contactPhone)}
                sx={{ borderRadius: 2 }}
              >
                Contact
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Posted {timeAgo(trade.createdAt)}
          </Typography>
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

const INITIAL_VISIBLE_COUNT = 10;
const LOAD_MORE_INCREMENT = 10;

export default function TradingPage() {
  const { user, getToken } = useAuth();
  const { showNotification } = useNotification();

  const [trades, setTrades] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingTrade, setEditingTrade] = useState<TradePost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

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
      // Validate form data using Zod schema
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
      showNotification(
        editingTrade ? 'Trade updated successfully!' : 'Trade posted successfully!',
        'success',
      );
    } catch (e) {
      if (e instanceof Error && e.constructor.name === 'ZodError') {
        const zodError = e as import('zod').ZodError;
        const formatted = formatZodError(zodError);
        const messages = formatted.details.map((d) => `${d.field}: ${d.message}`).join('\n');
        setError(`Validation failed:\n${messages}`);
      } else if (e instanceof ApiError && e.details) {
        const messages = e.details.map((d) => `${d.field}: ${d.message}`).join('\n');
        setError(`Validation failed:\n${messages}`);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleContact = useCallback(
    async (phone: string) => {
      try {
        await navigator.clipboard.writeText(phone);
        showNotification('Phone number copied to clipboard!', 'success');
      } catch {
        showNotification(`Phone: ${phone}`, 'info');
      }
    },
    [showNotification],
  );

  const handleUpdate = useCallback(
    async (id: string, updates: Partial<TradePost>) => {
      try {
        const token = await getToken();
        const updated = await updateTrade(token, id, updates);
        setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
        showNotification('Trade updated!', 'success');
      } catch (e) {
        if (e instanceof ApiError && e.details) {
          const messages = e.details.map((d) => `${d.field}: ${d.message}`).join('\n');
          setError(`Validation failed:\n${messages}`);
        } else {
          setError((e as Error).message);
        }
      }
    },
    [getToken, showNotification],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const token = await getToken();
        await deleteTrade(token, id);
        setTrades((prev) => prev.filter((t) => t.id !== id));
        showNotification('Trade deleted', 'info');
      } catch (e) {
        if (e instanceof ApiError && e.details) {
          const messages = e.details.map((d) => `${d.field}: ${d.message}`).join('\n');
          setError(`Validation failed:\n${messages}`);
        } else {
          setError((e as Error).message);
        }
      }
    },
    [getToken, showNotification],
  );

  const filteredTrades = useMemo(() => {
    if (!search.trim()) return trades;
    const lower = search.toLowerCase();
    return trades.filter(
      (t) =>
        t.courseCode.toLowerCase().includes(lower) ||
        t.courseName?.toLowerCase().includes(lower) ||
        t.sectionOffered.toLowerCase().includes(lower) ||
        t.sectionWanted.toLowerCase().includes(lower),
    );
  }, [trades, search]);

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, []);

  const visibleTrades = useMemo(() => {
    return filteredTrades.slice(0, visibleCount);
  }, [filteredTrades, visibleCount]);

  const hasMoreTrades = visibleCount < filteredTrades.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_INCREMENT);
  };

  if (loading) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h4" fontWeight={700}>
            Course Trading
          </Typography>
        </Stack>
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" mb={2}>
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
                <Stack direction="row" spacing={1} mt={2}>
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Course Trading
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={loadTrades} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            color="accent"
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
          icon={<SwapHoriz sx={{ fontSize: 48 }} />}
          title="No Trades Yet"
          description="Be the first to post a course trade and find your ideal section."
          action={
            <Button
              variant="contained"
              color="accent"
              startIcon={<SwapHoriz />}
              onClick={() => setDialogOpen(true)}
            >
              Post Trade
            </Button>
          }
        />
      ) : (
        <Stack spacing={2}>
          <TextField
            placeholder="Search trades..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 1 }}
          />

          <Typography variant="h6">
            Showing {visibleTrades.length} of {filteredTrades.length} Trade
            {filteredTrades.length !== 1 ? 's' : ''}
          </Typography>

          <Stack spacing={2}>
            {visibleTrades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onContact={handleContact}
              />
            ))}
          </Stack>

          {hasMoreTrades && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={handleLoadMore} sx={{ minWidth: 200 }}>
                Load More ({LOAD_MORE_INCREMENT} more)
              </Button>
            </Box>
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
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Course Details
              </Typography>
              <TextField
                label="Course Code"
                placeholder="e.g., CS 301"
                value={tradeForm.courseCode}
                onChange={(e) => setTradeForm({ ...tradeForm, courseCode: e.target.value })}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <School fontSize="small" />
                    </InputAdornment>
                  ),
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <School fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ArrowForward fontSize="small" />
                      </InputAdornment>
                    ),
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
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ArrowBack fontSize="small" />
                      </InputAdornment>
                    ),
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Description fontSize="small" />
                  </InputAdornment>
                ),
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
    </Box>
  );
}
