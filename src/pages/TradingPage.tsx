import {
  Add,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Close,
  ContactPhone,
  ContentCopy,
  Description,
  HourglassEmpty,
  Phone,
  School,
  Search,
  SwapHoriz,
  SwapVert,
  AutoAwesome,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  createTrade,
  deleteTrade,
  getTrades as fetchTrades,
  updateTrade,
} from '../services/tradesApi';
import { llmService } from '../services/llm';
import { getLlmConfig } from '../config/llmConfig';
import type { TradePost } from '../types';
import { timeAgo } from '../utils';

function TradeCard({
  trade,
  onUpdate,
  onDelete,
  onEdit,
  onContact,
  onDraftAi,
}: {
  trade: TradePost;
  onUpdate: (id: string, updates: Partial<TradePost>) => void;
  onDelete: (id: string) => void;
  onEdit: (trade: TradePost) => void;
  onContact: (phone: string) => void;
  onDraftAi: (trade: TradePost) => void;
}) {
  const { user } = useAuth();
  const isOwner = user && trade.auth0UserId === user.id;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = {
    open: { color: 'success' as const, icon: <CheckCircle fontSize="small" /> },
    pending: { color: 'warning' as const, icon: <HourglassEmpty fontSize="small" /> },
    completed: { color: 'info' as const, icon: <CheckCircle fontSize="small" /> },
    cancelled: { color: 'default' as const, icon: <Close fontSize="small" /> },
  };

  return (
    <Card
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        transition: 'all 0.2s ease-in-out',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? 6 : 1,
        opacity: trade.status === 'cancelled' ? 0.7 : 1,
        '&:hover .owner-actions': {
          opacity: 1,
        },
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
              <>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<ContactPhone />}
                  onClick={() => onContact(trade.contactPhone)}
                  sx={{ borderRadius: 2 }}
                >
                  Contact
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesome />}
                  onClick={() => onDraftAi(trade)}
                  sx={{ borderRadius: 2 }}
                >
                  Draft Message
                </Button>
              </>
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
            transition: 'opacity 0.2s',
            bgcolor: 'action.hover',
            py: 1,
            px: 2,
            display: 'flex',
            gap: 1,
          }}
        >
          <Button size="small" onClick={() => onEdit(trade)}>
            Edit
          </Button>
          {trade.status === 'open' && (
            <Button size="small" onClick={() => onUpdate(trade.id, { status: 'pending' })}>
              Mark Pending
            </Button>
          )}
          <Button size="small" onClick={() => onUpdate(trade.id, { status: 'completed' })}>
            Complete
          </Button>
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
}

export default function TradingPage() {
  const { user, getToken } = useAuth();

  const [trades, setTrades] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingTrade, setEditingTrade] = useState<TradePost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // AI states
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDraftText, setAiDraftText] = useState('');

  const [tradeForm, setTradeForm] = useState({
    courseCode: '',
    courseName: '',
    sectionOffered: '',
    sectionWanted: '',
    description: '',
    contactPhone: '',
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

  const handleEdit = (trade: TradePost) => {
    setEditingTrade(trade);
    setTradeForm({
      courseCode: trade.courseCode,
      courseName: trade.courseName || '',
      sectionOffered: trade.sectionOffered,
      sectionWanted: trade.sectionWanted,
      description: trade.description || '',
      contactPhone: trade.contactPhone || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const token = await getToken();

      if (editingTrade) {
        await updateTrade(token, editingTrade.id, tradeForm);
      } else {
        await createTrade(token, tradeForm);
      }

      setDialogOpen(false);
      setEditingTrade(null);
      setTradeForm({
        courseCode: '',
        courseName: '',
        sectionOffered: '',
        sectionWanted: '',
        description: '',
        contactPhone: '',
      });
      await loadTrades();
      setSnackbar({ open: true, message: 'Trade posted successfully!' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContact = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setSnackbar({ open: true, message: 'Phone number copied to clipboard!' });
    } catch {
      setSnackbar({ open: true, message: `Phone: ${phone}` });
    }
  };

  const handleDraftAi = async (trade: TradePost) => {
    setAiDraftOpen(true);
    setAiDrafting(true);
    setAiDraftText('');

    try {
      await llmService.initialize(getLlmConfig(), 'DRAFT');
      const draft = await llmService.draftTradeMessage(trade);
      setAiDraftText(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI draft');
      setAiDraftOpen(false);
    } finally {
      setAiDrafting(false);
    }
  };

  const copyDraftToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(aiDraftText);
      setSnackbar({ open: true, message: 'Draft copied to clipboard!' });
      setAiDraftOpen(false);
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to copy text' });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<TradePost>) => {
    try {
      const token = await getToken();
      await updateTrade(token, id, updates);
      await loadTrades();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken();
      await deleteTrade(token, id);
      await loadTrades();
    } catch (e) {
      setError((e as Error).message);
    }
  };

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
        <Button variant="outlined" onClick={loadTrades} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {trades.length === 0 && !loading ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SwapHoriz sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Trades Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Be the first to post a course trade
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
              Post Trade
            </Button>
          </CardContent>
        </Card>
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
            {filteredTrades.length} Trade{filteredTrades.length !== 1 ? 's' : ''}
            {search && ` (${trades.length} total)`}
          </Typography>

          {filteredTrades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onContact={handleContact}
              onDraftAi={handleDraftAi}
            />
          ))}
        </Stack>
      )}

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setDialogOpen(true)}
      >
        <Add />
      </Fab>

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

            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Contact Information
              </Typography>
              <TextField
                label="Phone Number"
                placeholder="+1 (555) 123-4567"
                value={tradeForm.contactPhone}
                onChange={(e) => setTradeForm({ ...tradeForm, contactPhone: e.target.value })}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ContactPhone fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                helperText="Other traders will use this to contact you"
              />
            </Box>
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
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {editingTrade ? 'Save Changes' : 'Post Trade'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={aiDraftOpen}
        onClose={() => !aiDrafting && setAiDraftOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome color="primary" /> AI Message Draft
        </DialogTitle>
        <DialogContent>
          {aiDrafting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <CircularProgress size={40} />
              <Typography sx={{ mt: 2 }}>Generating draft...</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                bgcolor: 'action.hover',
                p: 2,
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                "{aiDraftText}"
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDraftOpen(false)} disabled={aiDrafting}>
            Cancel
          </Button>
          <Button
            onClick={copyDraftToClipboard}
            variant="contained"
            disabled={aiDrafting || !aiDraftText}
            startIcon={<ContentCopy />}
          >
            Copy Draft
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
