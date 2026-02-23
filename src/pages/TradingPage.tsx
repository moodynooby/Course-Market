import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  Stack,
  Alert,
  IconButton,
  Avatar,
  Fab,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import { Add, SwapHoriz, Phone, Search } from '@mui/icons-material';
import {
  getTrades as fetchTrades,
  createTrade,
  updateTrade,
  deleteTrade,
} from '../services/tradesApi';
import { useAuth } from '../hooks/useAuth';
import type { TradePost } from '../types';

function TradeCard({
  trade,
  onUpdate,
  onDelete,
  onEdit,
}: {
  trade: TradePost;
  onUpdate: (id: string, updates: Partial<TradePost>) => void;
  onDelete: (id: string) => void;
  onEdit: (trade: TradePost) => void;
}) {
  const { user } = useAuth();
  const isOwner = user && trade.auth0UserId === user.id;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar sx={{ width: 32, height: 32 }}>{trade.userDisplayName[0] || 'U'}</Avatar>
            <Typography variant="body2" color="text.secondary">
              {trade.userDisplayName}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={trade.action === 'offer' ? 'Offering' : 'Looking for'}
              color={trade.action === 'offer' ? 'primary' : 'secondary'}
            />
            <Chip
              size="small"
              label={trade.status}
              color={
                trade.status === 'open'
                  ? 'success'
                  : trade.status === 'pending'
                    ? 'warning'
                    : trade.status === 'completed'
                      ? 'info'
                      : 'default'
              }
            />
          </Stack>
        </Stack>

        <Typography variant="h6" gutterBottom fontWeight={600}>
          {trade.courseCode}
        </Typography>
        {trade.courseName && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {trade.courseName}
          </Typography>
        )}

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip
            icon={<SwapHoriz />}
            label={`Has: ${trade.sectionOffered}`}
            size="small"
            color="success"
          />
          <Chip
            icon={<SwapHoriz />}
            label={`Wants: ${trade.sectionWanted}`}
            size="small"
            color="info"
          />
        </Stack>

        {trade.description && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {trade.description}
          </Typography>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {new Date(trade.createdAt).toLocaleDateString()}
          </Typography>

          {trade.contactPhone && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {trade.contactPhone}
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>

      {isOwner && (
        <CardActions>
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
        </CardActions>
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
  const [tradeForm, setTradeForm] = useState({
    courseCode: '',
    courseName: '',
    sectionOffered: '',
    sectionWanted: '',
    action: 'offer' as 'offer' | 'request',
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
      action: trade.action,
      description: trade.description || '',
      contactPhone: trade.contactPhone || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;

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
        action: 'offer',
        description: '',
        contactPhone: '',
      });
      await loadTrades();
    } catch (e) {
      setError((e as Error).message);
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
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Course Code *"
              value={tradeForm.courseCode}
              onChange={(e) => setTradeForm({ ...tradeForm, courseCode: e.target.value })}
              fullWidth
            />
            <TextField
              label="Course Name"
              value={tradeForm.courseName}
              onChange={(e) => setTradeForm({ ...tradeForm, courseName: e.target.value })}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Section Offering *"
                value={tradeForm.sectionOffered}
                onChange={(e) => setTradeForm({ ...tradeForm, sectionOffered: e.target.value })}
                fullWidth
              />
              <TextField
                label="Section Wanted *"
                value={tradeForm.sectionWanted}
                onChange={(e) => setTradeForm({ ...tradeForm, sectionWanted: e.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              select
              label="Trade Type *"
              value={tradeForm.action}
              onChange={(e) =>
                setTradeForm({ ...tradeForm, action: e.target.value as 'offer' | 'request' })
              }
              fullWidth
            >
              <MenuItem value="offer">I can offer</MenuItem>
              <MenuItem value="request">I'm looking for</MenuItem>
            </TextField>
            <TextField
              label="Description"
              value={tradeForm.description}
              onChange={(e) => setTradeForm({ ...tradeForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Contact Phone"
              value={tradeForm.contactPhone}
              onChange={(e) => setTradeForm({ ...tradeForm, contactPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
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
              !tradeForm.courseCode || !tradeForm.sectionOffered || !tradeForm.sectionWanted
            }
          >
            {editingTrade ? 'Save Changes' : 'Post Trade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
