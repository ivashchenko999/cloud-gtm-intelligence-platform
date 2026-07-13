import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n, { LANGUAGE_STORAGE_KEY } from './i18n';
import { AppProviders, AppRoutes } from './App';

function renderApp(initialEntry = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
  localStorage.clear();
});

describe('application shell', () => {
  it('renders localized navigation in English', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('switches navigation labels to French and persists the choice', async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'FR' }));
    expect(await screen.findByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('fr-CA');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });

  it('renders the account detail route with the account id', () => {
    renderApp('/accounts/acc-123');
    expect(screen.getByRole('heading', { name: 'Account detail' })).toBeInTheDocument();
    expect(screen.getByText(/acc-123/)).toBeInTheDocument();
  });

  it('redirects unknown routes to the dashboard', () => {
    renderApp('/nope');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
