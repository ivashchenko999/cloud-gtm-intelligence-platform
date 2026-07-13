/**
 * Uploads a file straight to S3 with a presigned PUT URL, reporting progress.
 * `fetch` can't surface upload progress, so this uses `XMLHttpRequest`; the
 * signed `Content-Type` must match what the URL was signed for or S3 rejects it.
 */
export function uploadFileToS3(params: {
  url: string;
  file: File;
  contentType: string;
  /** Called with a 0–1 fraction as the upload streams. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { url, file, contentType, onProgress, signal } = params;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', contentType);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')));

    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}
