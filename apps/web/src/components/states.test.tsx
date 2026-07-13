import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../i18n';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

afterEach(cleanup);

describe('shared state components', () => {
  it('renders the default localized loading label', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('renders empty state with default title and a custom description', () => {
    render(<EmptyState description="No accounts yet" />);
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument();
    expect(screen.getByText('No accounts yet')).toBeInTheDocument();
  });

  it('renders error state and fires retry when clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render a retry button without a handler', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
