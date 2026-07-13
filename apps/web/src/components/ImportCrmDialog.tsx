import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import type { CreateImportRequest, ImportStatus } from '@cloud-gtm/api-client';
import { getGetImportsQueryKey, usePostImports } from '@cloud-gtm/api-client';
import { MAX_IMPORT_BYTES } from '@cloud-gtm/contracts';
import { uploadFileToS3 } from '../api/upload';

type CsvContentType = CreateImportRequest['contentType'];
type Phase = 'select' | 'creating' | 'uploading' | 'done';
type ErrorKey = 'invalidType' | 'fileTooLarge' | 'uploadFailed';

const CSV_CONTENT_TYPES: readonly CsvContentType[] = ['text/csv', 'application/vnd.ms-excel'];

/** Keeps the native file input in the accessibility tree but out of view. */
const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

/** The upload UI status mirrored from the import lifecycle, per phase. */
const PHASE_STATUS: Partial<Record<Phase, ImportStatus>> = {
  creating: 'PENDING',
  uploading: 'UPLOADING',
};

/**
 * Resolves the CSV content type S3 will be asked to sign. Some browsers report
 * an empty MIME type for `.csv`, so fall back to the file extension.
 */
function resolveCsvContentType(file: File): CsvContentType | null {
  if ((CSV_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return file.type as CsvContentType;
  }
  return file.name.toLowerCase().endsWith('.csv') ? 'text/csv' : null;
}

export interface ImportCrmDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Starts a CRM import: validates the chosen CSV, requests a presigned URL via
 * `POST /imports`, then uploads the file straight to S3 with a progress bar. The
 * client-side status walks PENDING → UPLOADING while the request is in flight.
 */
export function ImportCrmDialog({ open, onClose }: ImportCrmDialogProps) {
  const { t } = useTranslation(['imports', 'common']);
  const queryClient = useQueryClient();
  const createImport = usePostImports();

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [progress, setProgress] = useState(0);
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null);

  const busy = phase === 'creating' || phase === 'uploading';

  const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    // Reset the input so re-picking the same file still fires a change event.
    event.target.value = '';
    if (!chosen) return;

    if (!resolveCsvContentType(chosen)) {
      setErrorKey('invalidType');
      setFile(null);
      return;
    }
    if (chosen.size > MAX_IMPORT_BYTES) {
      setErrorKey('fileTooLarge');
      setFile(null);
      return;
    }
    setErrorKey(null);
    setFile(chosen);
  };

  const handleUpload = async () => {
    if (!file) return;
    const contentType = resolveCsvContentType(file);
    if (!contentType) {
      setErrorKey('invalidType');
      return;
    }

    setErrorKey(null);
    setProgress(0);
    setPhase('creating');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const created = await createImport.mutateAsync({
        data: { filename: file.name, contentType, sizeBytes: file.size },
      });
      setPhase('uploading');
      await uploadFileToS3({
        url: created.uploadUrl,
        file,
        contentType,
        onProgress: setProgress,
        signal: controller.signal,
      });
      setPhase('done');
      await queryClient.invalidateQueries({ queryKey: getGetImportsQueryKey() });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setErrorKey('uploadFailed');
      setPhase('select');
    } finally {
      abortRef.current = null;
    }
  };

  const handleClose = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFile(null);
    setPhase('select');
    setProgress(0);
    setErrorKey(null);
    onClose();
  };

  const status = PHASE_STATUS[phase];

  return (
    <Dialog open={open} onClose={busy ? undefined : handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dialog.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{t('dialog.description')}</DialogContentText>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          aria-label={t('dialog.chooseFile')}
          style={VISUALLY_HIDDEN}
          onChange={handleSelectFile}
        />

        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {file ? t('dialog.changeFile') : t('dialog.chooseFile')}
            </Button>
            <Typography variant="body2" color="text.secondary" noWrap>
              {file ? file.name : t('dialog.noFileSelected')}
            </Typography>
          </Stack>

          {!file && !errorKey && (
            <Typography variant="caption" color="text.secondary">
              {t('dialog.hint')}
            </Typography>
          )}

          {busy && status && (
            <Stack spacing={1}>
              <Typography variant="body2">
                {t('dialog.statusLabel', { status: t(`status.${status}`) })}
              </Typography>
              <LinearProgress
                variant={phase === 'uploading' ? 'determinate' : 'indeterminate'}
                value={Math.round(progress * 100)}
              />
            </Stack>
          )}

          {phase === 'done' && (
            <Alert severity="success">{t('dialog.success', { filename: file?.name ?? '' })}</Alert>
          )}

          {errorKey && <Alert severity="error">{t(`dialog.errors.${errorKey}`)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>
          {phase === 'done' ? t('common:actions.close') : t('common:actions.cancel')}
        </Button>
        {phase !== 'done' && (
          <Button variant="contained" onClick={handleUpload} disabled={!file || busy}>
            {t('dialog.upload')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
