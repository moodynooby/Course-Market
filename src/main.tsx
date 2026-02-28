import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ENV } from './config/devConfig';

const auth0Config = {
  domain: ENV.AUTH0_DOMAIN,
  clientId: ENV.AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin + '/callback',
    audience: ENV.AUTH0_AUDIENCE,
    scope: 'openid profile email',
  },
  cacheLocation: 'localstorage' as const,
  useRefreshTokens: true,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider {...auth0Config}>
      <App />
    </Auth0Provider>
  </StrictMode>,
);
