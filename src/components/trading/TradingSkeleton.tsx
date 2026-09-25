import { Box, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';

export function TradingSkeleton() {
  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', sm: '2rem' } }}>
          Course Trading
        </Typography>
      </Stack>
      <Stack spacing={2}>
        {['first', 'second', 'third'].map((card) => (
          <Card key={card} variant="outlined">
            <CardContent>
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 2 }}>
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
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
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
