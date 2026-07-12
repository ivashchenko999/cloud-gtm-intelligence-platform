import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from './i18n';
import { AppProviders, AppRoutes } from './App';

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('en');
});

describe('application shell', () => {
  it('renders localized navigation in English', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument();
  });

  it('switches navigation labels to French', async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'FR' }));
    expect(await screen.findByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('fr-CA');
  });
});
