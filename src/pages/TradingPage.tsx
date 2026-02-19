import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Add, SwapHoriz, Phone } from '@mui/icons-material';
import {
  getTrades as fetchTrades,
  createTrade,
  updateTradeStatus,
  deleteTrade,
} from '../services/tradesApi';
import { useAuth } from '../context/AuthContext';
import type { TradePost } from '../types';

function TradeCard({
  trade,
  onUpdate,
  onDelete,
}: {
  trade: TradePost;
  onUpdate: (id: string, updates: Partial<TradePost>) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const canManage = user && trade.userId === user.uid;

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

      {canManage && (
        <CardActions>
          {trade.status === 'open' && (
            <Button size="small" onClick={() => onUpdate(trade.id, { status: 'pending' })}>
              Mark Pending
            </Button>
          )}
          {(trade.status === 'open' || trade.status === 'pending') && (
            <Button size="small" onClick={() => onUpdate(trade.id, { status: 'completed' })}>
              Complete
            </Button>
          )}
          <Button size="small" color="error" onClick={() => onDelete(trade.id)}>
            Delete
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

export default function TradingPage() {
  const { user } = useAuth();

  const [trades, setTrades] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tradeForm, setTradeForm] = useState({
    courseCode: '',
    courseName: '',
    sectionOffered: '',
    sectionWanted: '',
    action: 'offer' as 'offer' | 'request',
    description: '',
    contactPhone: '',
  });

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTrades();
      setTrades(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    try {
      await createTrade(user.uid, user.displayName || 'User', {
        courseCode: tradeForm.courseCode,
        courseName: tradeForm.courseName,
        sectionOffered: tradeForm.sectionOffered,
        sectionWanted: tradeForm.sectionWanted,
        action: tradeForm.action,
        description: tradeForm.description || undefined,
        contactPhone: tradeForm.contactPhone || undefined,
      });
      setDialogOpen(false);
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
    if (updates.status) {
      try {
        await updateTradeStatus(id, updates.status as 'pending' | 'completed' | 'cancelled');
        await loadTrades();
      } catch (e) {
        setError((e as Error).message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrade(id);
      await loadTrades();
    } catch (e) {
      setError((e as Error).message);
    }
  };

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
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {trades.length} Trade{trades.length !== 1 ? 's' : ''}
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
              Post Trade
            </Button>
          </Stack>

          {trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Post a Trade</DialogTitle>
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
              label="Contact Phone (optional)"
              value={tradeForm.contactPhone}
              onChange={(e) => setTradeForm({ ...tradeForm, contactPhone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !tradeForm.courseCode || !tradeForm.sectionOffered || !tradeForm.sectionWanted
            }
          >
            Post Trade
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
