import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AccountSummary, ListAccountsResponse } from '@cloud-gtm/contracts';
import i18n from '../i18n';
import { createAppTheme } from '../theme';
import { AccountsPage } from './AccountsPage';

const account: AccountSummary = {
  id: 'acc-1',
  name: 'Globex',
  domain: 'globex.example',
  industry: 'Software',
  employeeCount: 1200,
  primaryCloud: 'AWS',
  estimatedCloudSpend: 750_000,
  marketplaceActivity: 'HIGH',
  purchaseIntentScore: 92,
  scoreLevel: 'HIGH',
  updatedAt: '2026-07-10T12:00:00.000Z',
};

const response: ListAccountsResponse = {
  items: [account],
  pagination: { page: 2, pageSize: 10, totalItems: 42, totalPages: 5 },
};

function renderAccounts(initialEntry = '/accounts') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={createAppTheme('en-CA')}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/accounts" element={<AccountsPage />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function lastFetchUrl(): URL {
  const calls = vi.mocked(fetch).mock.calls;
  const [url] = calls[calls.length - 1] ?? [];
  return new URL(String(url), 'https://app.test');
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(response), { status: 200 }))),
  );
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('AccountsPage', () => {
  it('hydrates server-side query params from the URL', async () => {
    renderAccounts(
      '/accounts?page=2&pageSize=10&sortBy=name&sortOrder=asc&search=globex&cloudProvider=AWS&minScore=80',
    );

    expect(await screen.findByRole('link', { name: 'Globex' })).toHaveAttribute(
      'href',
      '/accounts/acc-1',
    );

    const url = lastFetchUrl();
    expect(url.pathname).toBe('/accounts');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('pageSize')).toBe('10');
    expect(url.searchParams.get('sortBy')).toBe('name');
    expect(url.searchParams.get('sortOrder')).toBe('asc');
    expect(url.searchParams.get('search')).toBe('globex');
    expect(url.searchParams.get('cloudProvider')).toBe('AWS');
    expect(url.searchParams.get('minScore')).toBe('80');
  });

  it('updates URL-backed filters before fetching the next page of rows', async () => {
    const user = userEvent.setup();
    renderAccounts('/accounts');

    await screen.findByRole('link', { name: 'Globex' });
    await user.click(screen.getByRole('combobox', { name: 'Intent level' }));
    await user.click(screen.getByRole('option', { name: 'High' }));

    await waitFor(() => {
      expect(lastFetchUrl().searchParams.get('scoreLevel')).toBe('HIGH');
    });
    expect(lastFetchUrl().searchParams.get('page')).toBe('1');
  });
});
