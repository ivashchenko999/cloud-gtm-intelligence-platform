import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { configureApiClient } from '@cloud-gtm/api-client';
import './i18n';
import { AppProviders, AppRoutes } from './App';

// CloudFront serves the SPA and proxies `/api/*` to the HTTP API, so the client
// targets a same-origin `/api` prefix by default; override for local dev.
configureApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api' });

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root was not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
