import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { MAX_IMPORT_BYTES } from '@cloud-gtm/contracts';
import i18n from '../i18n';
import { createAppTheme } from '../theme';
import { ImportCrmDialog } from './ImportCrmDialog';
import { uploadFileToS3 } from '../api/upload';

vi.mock('../api/upload', () => ({ uploadFileToS3: vi.fn() }));

const uploadMock = vi.mocked(uploadFileToS3);

const presignedResponse = {
  importId: 'imp_test',
  uploadUrl: 'https://s3.test.local/import.csv?signature=fake',
  s3Key: 'imports/ws_demo/imp_test.csv',
  expiresInSeconds: 900,
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={createAppTheme('en-CA')}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <LocationProbe />
            <ImportCrmDialog open onClose={onClose} />
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>,
  );
  return { onClose };
}

function csvFile(name = 'crm-export.csv', type = 'text/csv', size?: number): File {
  const file = new File(['name,cloud\nAcme,AWS\n'], name, { type });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

beforeEach(() => {
  uploadMock.mockReset();
  uploadMock.mockResolvedValue(undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(presignedResponse), { status: 201 }))),
  );
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await i18n.changeLanguage('en');
});

describe('ImportCrmDialog', () => {
  it('rejects a non-CSV file before any request is made', async () => {
    renderDialog();

    // fireEvent bypasses the input's `accept` filter to exercise the JS guard.
    fireEvent.change(screen.getByLabelText('Choose CSV file'), {
      target: { files: [new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText(/choose a \.csv file/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('rejects a file above the size limit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(
      screen.getByLabelText('Choose CSV file'),
      csvFile('big.csv', 'text/csv', MAX_IMPORT_BYTES + 1),
    );

    expect(await screen.findByText(/larger than the 10 MB limit/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates an import and uploads the file to the presigned URL', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText('Choose CSV file'), csvFile());
    expect(await screen.findByText('crm-export.csv')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Upload' }));

    // POST /imports carried the file metadata.
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const fetchCall = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    if (!fetchCall) throw new Error('fetch was not called');
    const [url, init] = fetchCall as [RequestInfo, RequestInit];
    expect(String(url)).toMatch(/\/imports$/);
    expect(init).toMatchObject({ method: 'POST' });
    expect(JSON.parse(init.body as string)).toMatchObject({
      filename: 'crm-export.csv',
      contentType: 'text/csv',
    });

    // The file went straight to S3 via the returned presigned URL.
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));
    const uploadCall = uploadMock.mock.calls[0];
    if (!uploadCall) throw new Error('uploadFileToS3 was not called');
    expect(uploadCall[0]).toMatchObject({
      url: presignedResponse.uploadUrl,
      contentType: 'text/csv',
    });

    expect(await screen.findByText(/uploaded\. processing will begin/i)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/imports/imp_test');
  });

  it('surfaces an error when the upload fails', async () => {
    uploadMock.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    renderDialog();

    await user.upload(screen.getByLabelText('Choose CSV file'), csvFile());
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    expect(await screen.findByText(/the upload failed/i)).toBeInTheDocument();
  });
});
