import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import i18n from '../i18n';
import { createAppTheme } from '../theme';
import { SettingsPage } from './SettingsPage';

const resetResponse = {
  deletedImports: 2,
  deletedImportErrors: 3,
  deletedAccounts: 5,
  deletedAccountScores: 5,
  deletedInsights: 1,
  deletedDashboardSummaries: 1,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={createAppTheme('en-CA')}>
          <SettingsPage />
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(resetResponse), { status: 200 }))),
  );
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('SettingsPage', () => {
  it('requires RESET confirmation before clearing workspace data', async () => {
    const user = userEvent.setup();
    renderPage();

    const button = screen.getByRole('button', { name: 'Reset workspace data' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('Type RESET to confirm'), 'reset');
    expect(button).toBeDisabled();

    await user.clear(screen.getByLabelText('Type RESET to confirm'));
    await user.type(screen.getByLabelText('Type RESET to confirm'), 'RESET');
    expect(button).toBeEnabled();
    await user.click(button);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const fetchCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    if (!fetchCall) throw new Error('fetch was not called');
    const [url, init] = fetchCall as [RequestInfo, RequestInit];
    expect(String(url)).toMatch(/\/settings\/reset-workspace$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(init.body as string)).toEqual({ confirmation: 'RESET' });

    expect(await screen.findByText('Workspace data reset completed.')).toBeInTheDocument();
    expect(screen.getByText('Accounts deleted')).toBeInTheDocument();
    expect(screen.getAllByText('5')).toHaveLength(2);
  });
});
