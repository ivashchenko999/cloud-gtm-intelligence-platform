import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Account } from '@cloud-gtm/api-client';
import i18n from '../i18n';
import { createAppTheme } from '../theme';
import { AccountDetailPage } from './AccountDetailPage';

const account: Account = {
  id: 'acc-1',
  name: 'Globex',
  domain: 'globex.example',
  industry: 'Software',
  employeeCount: 1200,
  annualRevenue: 12_000_000,
  primaryCloud: 'AWS',
  estimatedCloudSpend: 750_000,
  existingProducts: ['Marketplace Pro'],
  marketplaceActivity: 'HIGH',
  marketplaceTransactions: 8,
  purchaseIntentScore: 92,
  scoreLevel: 'HIGH',
  scoreVersion: 'rules-v1',
  scoreFactors: [
    { code: 'cloud_spend', label: 'High cloud spend', points: 30 },
    { code: 'marketplace_activity', label: 'Marketplace activity', points: 20 },
  ],
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-10T12:00:00.000Z',
};

function renderDetail(initialEntry = '/accounts/acc-1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={createAppTheme('en-CA')}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(account), { status: 200 }))),
  );
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('AccountDetailPage', () => {
  it('loads an account profile into a detail drawer', async () => {
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Globex' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/accounts/acc-1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(screen.getByText('globex.example')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('Marketplace Pro')).toBeInTheDocument();
    expect(screen.getByText('High cloud spend')).toBeInTheDocument();
    expect(screen.getByText('+30')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain score/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Recommend next action/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Draft outreach/i })).toBeDisabled();
  });

  it('localizes drawer labels in French', async () => {
    await i18n.changeLanguage('fr');
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Globex' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Facteurs de score' })).toBeInTheDocument();
    expect(screen.getByText('Élevé')).toBeInTheDocument();
  });
});
