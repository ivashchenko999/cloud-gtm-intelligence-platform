import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import type { DashboardResponse } from '@cloud-gtm/contracts';
import i18n from '../i18n';
import { createAppTheme } from '../theme';
import { DashboardPage } from './DashboardPage';

const dashboard: DashboardResponse = {
  totalAccounts: 128,
  highIntentAccounts: 24,
  averageIntentScore: 62.4,
  estimatedPipelineValue: 3_200_000,
  cloudOpportunities: { aws: 70, azure: 40, gcp: 18 },
  intentDistribution: [
    { key: 'HIGH', count: 24 },
    { key: 'MEDIUM', count: 52 },
    { key: 'LOW', count: 52 },
  ],
  cloudDistribution: [
    { key: 'AWS', count: 70 },
    { key: 'AZURE', count: 40 },
    { key: 'GCP', count: 18 },
  ],
  industryDistribution: [
    { key: 'Software', count: 60 },
    { key: 'Finance', count: 30 },
  ],
  topAccounts: [
    {
      id: 'acc-1',
      name: 'Globex',
      industry: 'Software',
      primaryCloud: 'AWS',
      purchaseIntentScore: 91,
      scoreLevel: 'HIGH',
      updatedAt: '2026-07-10T12:00:00.000Z',
    },
  ],
  latestImport: {
    id: 'imp-1',
    filename: 'crm-export.csv',
    status: 'COMPLETED',
    uploadedBy: 'demo-user',
    uploadedAt: '2026-07-12T18:00:00.000Z',
    totalRows: 128,
    successfulRows: 126,
    failedRows: 2,
    durationMs: 42_000,
  },
};

function stubFetch(response: Response | (() => Response)) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(typeof response === 'function' ? response() : response.clone())),
  );
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={createAppTheme('en-CA')}>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  stubFetch(new Response(JSON.stringify(dashboard), { status: 200 }));
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('DashboardPage', () => {
  it('shows a loading state before the dashboard data resolves', () => {
    renderDashboard();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders KPI cards and the top accounts once data loads', async () => {
    renderDashboard();

    expect(await screen.findByText('Total Accounts')).toBeInTheDocument();
    expect(screen.getByText('High-Intent Accounts')).toBeInTheDocument();
    expect(screen.getByText('AWS Opportunities')).toBeInTheDocument();

    // Top-10 account renders as a link into the accounts detail route.
    const topAccounts = screen.getByRole('table', { name: 'Top 10 Accounts' });
    expect(within(topAccounts).getByRole('link', { name: 'Globex' })).toHaveAttribute(
      'href',
      '/accounts/acc-1',
    );

    // Latest import panel surfaces the localized status.
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
  });

  it('localizes chart labels and axes in French', async () => {
    await i18n.changeLanguage('fr');
    renderDashboard();

    expect(await screen.findByText('Répartition de l’intention d’achat')).toBeInTheDocument();
    expect(screen.getByText('Répartition des fournisseurs infonuagiques')).toBeInTheDocument();
    // Intent buckets are relabelled through the shared score-level dictionary.
    expect(screen.getByText('Élevé')).toBeInTheDocument();
  });

  it('shows an empty state when there are no accounts', async () => {
    stubFetch(new Response(JSON.stringify({ ...dashboard, totalAccounts: 0 }), { status: 200 }));
    renderDashboard();

    expect(await screen.findByText('No accounts yet')).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the request fails', async () => {
    stubFetch(new Response('{}', { status: 500 }));
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
