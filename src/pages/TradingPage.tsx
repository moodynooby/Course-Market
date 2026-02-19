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
import { Add, SwapHoriz, Phone, Edit, Delete, CheckCircle, Cancel } from '@mui/icons-material';
import { getTrades, addTrade, updateTrade, deleteTrade } from '../services/database';
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

  useEffect(() => {
    setTrades(getTrades());
  }, []);

  const handleSubmit = () => {
    if (!user) return;

    const newTrade: TradePost = {
      id: `trade-${Date.now()}`,
      userId: user.uid,
      userDisplayName: user.displayName || 'User',
      ...tradeForm,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTrade(newTrade);
    setTrades(getTrades());
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
  };

  const handleUpdate = (id: string, updates: Partial<TradePost>) => {
    const updated = updateTrade(id, updates);
    if (updated) {
      setTrades(getTrades());
    }
  };

  const handleDelete = (id: string) => {
    deleteTrade(id);
    setTrades(getTrades());
  };

  const loadSampleTrades = () => {
    if (!user) return;

    // Add sample trades
    const sampleTrades: Omit<TradePost, 'id' | 'userId' | 'userDisplayName'>[] = [
      {
        courseCode: 'CS 101',
        courseName: 'Intro to Computer Science',
        sectionOffered: '001',
        sectionWanted: '002',
        action: 'offer',
        status: 'open',
        description:
          'Can offer section 001 (Dr. Smith MWF 9:00) for section 002 (Dr. Jones MWF 10:00)',
        contactPhone: '+1-555-0123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        courseCode: 'MATH 201',
        courseName: 'Calculus II',
        sectionOffered: '002',
        sectionWanted: '001',
        action: 'request',
        status: 'open',
        description: 'Looking for morning section 001 (Dr. Brown MWF 8:00)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    sampleTrades.forEach((trade) => {
      const newTrade: TradePost = {
        id: `sample-${Date.now()}-${Math.random()}`,
        userId: user.uid,
        userDisplayName: user.displayName || 'Sample User',
        ...trade,
      };
      addTrade(newTrade);
    });

    setTrades(getTrades());
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight={700}>
          Course Trading
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setTrades(getTrades())}>
            Refresh
          </Button>
          <Button variant="outlined" onClick={loadSampleTrades}>
            Load Sample
          </Button>
        </Stack>
      </Stack>

      {trades.length === 0 ? (
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
