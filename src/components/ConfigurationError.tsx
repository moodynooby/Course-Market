import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material';

export function ConfigurationError() {
  const handleReload = () => window.location.reload();

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Paper elevation={0} variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configuration required
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          This app is missing its sign-in configuration. Add the required Auth0 environment
          variables, then reload the page.
        </Typography>
        <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
          Required variables: VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID.
        </Alert>
        <Box>
          <Button variant="contained" onClick={handleReload}>
            Reload app
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
