import {
  Upload,
  School,
  CalendarMonth,
  SwapHoriz,
  Close,
  AutoAwesome,
  ArrowForward,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: <Upload />,
    title: '1. Import CSV',
    description: 'Download the CSV from your Course Directory and upload it.',
  },
  {
    icon: <School />,
    title: '2. Browse & Select',
    description: 'Find courses and pick sections that fit your needs.',
  },
  {
    icon: <CalendarMonth />,
    title: '3. Optimize',
    description: 'Let the AI find the best conflict-free schedule.',
  },
  {
    icon: <SwapHoriz />,
    title: '4. Trade',
    description: 'Swap sections with other students directly.',
  },
];

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '24px', p: 2 } }}
    >
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pb: 0, p: 1 }}
      >
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', px: { xs: 2, sm: 4 }, pb: 4, pt: 1 }}>
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
          <AutoAwesome sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography
          variant="h4"
          fontWeight={800}
          gutterBottom
          sx={{ fontFamily: '"Zilla Slab", serif', color: 'accent.main' }}
        >
          Welcome to AuraIsHub
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 400, mx: 'auto', mb: 4 }}
        >
          Import your courses, pick your sections, optimize with AI, then trade with others.
        </Typography>

        <Box sx={{ textAlign: 'left', mb: 4 }}>
          <List sx={{ pt: 0 }}>
            {steps.map((step) => (
              <ListItem key={step.title} sx={{ px: 0, py: 1.5 }}>
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: 'action.hover',
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {step.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight={700}>
                      {step.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
        >
          <Button
            variant="contained"
            size="large"
            color="accent"
            onClick={() => {
              onClose();
              navigate('/courses');
            }}
            endIcon={<ArrowForward />}
            sx={{ px: 4, width: { xs: '100%', sm: 'auto' } }}
          >
            Get Started
          </Button>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
          <Button
            variant="outlined"
            size="large"
            color="accent"
            onClick={() => {
              onClose();
              navigate('/trading');
            }}
            startIcon={<SwapHoriz />}
            sx={{ px: 4, width: { xs: '100%', sm: 'auto' } }}
          >
            Jump to Trading
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
