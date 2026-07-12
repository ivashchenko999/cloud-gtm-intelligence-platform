import { useEffect, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { Navigate, Route, Routes } from 'react-router-dom';
import { createAppTheme } from './theme';
import { toSupportedLocale } from './i18n';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './routes/DashboardPage';
import { AccountsPage } from './routes/AccountsPage';
import { ImportsPage } from './routes/ImportsPage';
import { SettingsPage } from './routes/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/imports" element={<ImportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const locale = toSupportedLocale(i18n.language);
  const theme = useMemo(() => createAppTheme(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
