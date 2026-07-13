import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** A request to mint a short-lived presigned URL for a direct-to-S3 PUT. */
export interface UploadUrlRequest {
  bucket: string;
  /** Backend-generated object key; never derived from client input. */
  key: string;
  /** Content type the client must send; baked into the signature. */
  contentType: string;
  expiresInSeconds: number;
}

export interface UploadTarget {
  url: string;
  expiresInSeconds: number;
}

/**
 * Port for handing out presigned upload URLs. The handler depends on this seam
 * so tests can assert on the request without reaching S3, while production signs
 * real URLs via {@link S3UploadSigner}.
 */
export interface UploadSigner {
  createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget>;
}

/**
 * Signs `PutObject` URLs against S3. The signed `ContentType` binds the URL to a
 * single content type, so a client cannot reuse it to upload arbitrary payloads.
 */
export class S3UploadSigner implements UploadSigner {
  constructor(private readonly client: S3Client) {}

  async createUploadUrl(request: UploadUrlRequest): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: request.bucket,
      Key: request.key,
      ContentType: request.contentType,
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: request.expiresInSeconds,
    });
    return { url, expiresInSeconds: request.expiresInSeconds };
  }
}

/**
 * Lazily builds one S3-backed signer per Lambda container and caches it across
 * warm invocations, mirroring how repositories are cached. Tests inject a fake
 * signer and never reach this path.
 */
let cached: UploadSigner | undefined;

export function getUploadSigner(): UploadSigner {
  cached ??= new S3UploadSigner(new S3Client({}));
  return cached;
}
