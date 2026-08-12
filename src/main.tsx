import { Auth0Provider } from '@auth0/auth0-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ConfigurationError } from './components/ConfigurationError.tsx';
import { env } from './utils/env.ts';

const auth0Config = {
  domain: env.AUTH0_DOMAIN,
  clientId: env.AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: `${window.location.origin}/callback`,
    ...(env.AUTH0_AUDIENCE ? { audience: env.AUTH0_AUDIENCE } : {}),
    scope: 'openid profile email',
  },
  cacheLocation: 'localstorage' as const,
  useRefreshTokens: true,
};

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Course-Market root element was not found.');
}

const application = env.AUTH0_CONFIGURED ? (
  <Auth0Provider {...auth0Config}>
    <App />
  </Auth0Provider>
) : (
  <ConfigurationError />
);

createRoot(rootElement).render(<StrictMode>{application}</StrictMode>);
