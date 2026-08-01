import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  key: number;
  message: string;
  severity: Severity;
  duration: number;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

let keyCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [pack, setPack] = useState<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pack.length && !current) {
      setCurrent({ ...pack[0] });
      setPack((prev) => prev.slice(1));
      setOpen(true);
    } else if (pack.length && current && open) {
      // Dismiss current so we can show the next one
      setOpen(false);
    }
  }, [pack, current, open]);

  const enqueue = useCallback((message: string, severity: Severity, duration: number) => {
    setPack((prev) => [...prev, { key: keyCounter++, message, severity, duration }]);
  }, []);

  const handleClose = (_: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  const handleExited = () => setCurrent(undefined);

  const toast = useMemo(
    () => ({
      success: (msg: string) => enqueue(msg, 'success', 3000),
      error: (msg: string) => enqueue(msg, 'error', 6000),
      info: (msg: string) => enqueue(msg, 'info', 3000),
      warning: (msg: string) => enqueue(msg, 'warning', 4000),
    }),
    [enqueue],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        autoHideDuration={current?.duration ?? 3000}
        onClose={handleClose}
        slotProps={{ transition: { onExited: handleExited } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={current?.severity ?? 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {current?.message ?? ''}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
