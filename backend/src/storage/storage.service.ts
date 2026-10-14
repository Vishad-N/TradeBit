import { Global, Injectable, Logger, Module, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Private file storage with three interchangeable drivers, picked from the environment:
 *   1. Cloudinary   - CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 *   2. S3-compatible - STORAGE_BUCKET (e.g. a Railway Bucket)
 *   3. Local folder - development only
 * Keys (e.g. books/<id>/pages/3.jpg) are generated server-side and never returned to clients.
 */
interface Driver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  deletePrefix(prefix: string): Promise<void>;
  /** Deletes exactly one stored file. */
  deleteKey(key: string): Promise<void>;
}

const notFound = () => new NotFoundException('Not found');

// ---------------------------------------------------------------- Cloudinary
/**
 * Everything is uploaded with type "authenticated": Cloudinary serves it only through URLs signed with
 * the API secret, so no file has a public URL. The API fetches a signed URL server-side and streams the
 * bytes to the user after its own authorisation checks.
 * Images (page JPEGs) use resource_type "image"; anything else (the original PDF) uses "raw".
 */
class CloudinaryDriver implements Driver {
  constructor() {
    if (process.env.CLOUDINARY_URL) {
      cloudinary.config({ secure: true }); // credentials are read from CLOUDINARY_URL
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  private static readonly IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

  /** Splits a storage key into Cloudinary's public_id / resource_type / format. */
  private static parse(key: string) {
    const m = key.match(CloudinaryDriver.IMAGE_EXT);
    if (m) return { publicId: key.slice(0, -m[0].length), resourceType: 'image' as const, format: m[0].slice(1).toLowerCase().replace('jpeg', 'jpg') };
    return { publicId: key, resourceType: 'raw' as const, format: undefined }; // raw public ids keep their extension
  }

  /** The SDK's default socket timeout is 60s, which large PDFs on a slow uplink exceed ("499 Request Timeout"). */
  private static readonly TIMEOUT_MS = Number(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS) || 10 * 60 * 1000;
  /** Bodies above this go up in chunks (Cloudinary's minimum chunk is 5MB), so each request stays short. */
  private static readonly CHUNK_BYTES = 6 * 1024 * 1024;
  private static readonly ATTEMPTS = 3;

  private uploadOnce(key: string, body: Buffer) {
    const { publicId, resourceType } = CloudinaryDriver.parse(key);
    const options = {
      public_id: publicId,
      resource_type: resourceType,
      type: 'authenticated' as const,
      overwrite: true,
      invalidate: true,
      timeout: CloudinaryDriver.TIMEOUT_MS,
    };
    return new Promise<void>((resolve, reject) => {
      if (body.length > CloudinaryDriver.CHUNK_BYTES) {
        cloudinary.uploader
          .upload_chunked_stream({ ...options, chunk_size: CloudinaryDriver.CHUNK_BYTES }, (err) => (err ? reject(err) : resolve()))
          .end(body);
      } else {
        cloudinary.uploader.upload_stream(options, (err) => (err ? reject(err) : resolve())).end(body);
      }
    });
  }

  async put(key: string, body: Buffer, _contentType: string) {
    let lastError: any;
    for (let attempt = 1; attempt <= CloudinaryDriver.ATTEMPTS; attempt++) {
      try {
        return await this.uploadOnce(key, body);
      } catch (e: any) {
        lastError = e;
        // Only transient failures are worth retrying; auth/permission errors will not fix themselves.
        const transient = e?.http_code === 499 || e?.http_code >= 500 || ['ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(e?.code);
        if (!transient || attempt === CloudinaryDriver.ATTEMPTS) break;
      }
    }
    // The SDK throws a plain object, not an Error, which Nest would log as "Object(3)". Make it readable.
    const e = lastError;
    const code = e?.http_code;
    const hint =
      code === 403 ? ' Cloudinary rejected the upload: the API key probably lacks the "create" permission. Create a key with full access under Settings > API Keys.'
      : code === 401 ? ' Check CLOUDINARY_CLOUD_NAME / API key / API secret.'
      : code === 420 || code === 429 ? ' Cloudinary rate limit reached.'
      : code === 499 ? ' The upload timed out after retries; check the server network or raise CLOUDINARY_UPLOAD_TIMEOUT_MS.'
      : '';
    throw new Error(`Cloudinary upload failed (${code ?? 'no status'}): ${e?.message ?? 'unknown error'}.${hint}`);
  }

  signedUrl(key: string) {
    const { publicId, resourceType, format } = CloudinaryDriver.parse(key);
    return cloudinary.url(publicId, { resource_type: resourceType, type: 'authenticated', sign_url: true, secure: true, format });
  }

  async get(key: string): Promise<Buffer> {
    const { publicId, resourceType } = CloudinaryDriver.parse(key);
    // Raw files (the original PDF) are not deliverable through the CDN on many accounts ("deny or ACL failure"),
    // so they are fetched through Cloudinary's signed API download instead. Page images use signed CDN URLs.
    const url = resourceType === 'raw'
      ? cloudinary.utils.private_download_url(publicId, '', { resource_type: 'raw', type: 'authenticated' })
      : this.signedUrl(key);
    const res = await fetch(url);
    if (res.status === 404) throw notFound();
    if (!res.ok) throw new Error(`Cloudinary fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  async deleteKey(key: string) {
    const { publicId, resourceType } = CloudinaryDriver.parse(key);
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated', invalidate: true });
  }

  async deletePrefix(prefix: string) {
    for (const resource_type of ['image', 'raw'] as const) {
      // delete_resources_by_prefix removes up to 1000 resources per call; repeat while Cloudinary reports more.
      for (let i = 0; i < 20; i++) {
        const res: any = await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type, type: 'authenticated', invalidate: true });
        if (!res?.partial) break;
      }
    }
    await cloudinary.api.delete_folder(prefix.replace(/\/$/, '')).catch(() => undefined); // folder may not exist / not empty
  }
}

// ---------------------------------------------------------------- S3-compatible
class S3Driver implements Driver {
  private readonly bucket = process.env.STORAGE_BUCKET!;
  private readonly s3 = new S3Client({
    region: process.env.STORAGE_REGION || 'auto',
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') !== 'false',
    credentials: process.env.STORAGE_ACCESS_KEY
      ? { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY || '' }
      : undefined,
  });

  async put(key: string, body: Buffer, contentType: string) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string) {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return Buffer.from(await res.Body!.transformToByteArray());
    } catch (e: any) {
      if (e?.name === 'NoSuchKey') throw notFound();
      throw e;
    }
  }

  async deleteKey(key: string) {
    await this.s3.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: [{ Key: key }] } }));
  }

  async deletePrefix(prefix: string) {
    let token: string | undefined;
    do {
      const list = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }));
      const keys = (list.Contents || []).map((o) => ({ Key: o.Key! }));
      if (keys.length) await this.s3.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }));
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  }
}

// ---------------------------------------------------------------- Local folder (dev)
class LocalDriver implements Driver {
  private readonly dir = path.resolve(process.env.STORAGE_LOCAL_DIR || './storage');

  private localPath(key: string) {
    const full = path.resolve(this.dir, key);
    if (full !== this.dir && !full.startsWith(this.dir + path.sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, body: Buffer) {
    const file = this.localPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.localPath(key));
    } catch (e: any) {
      if (e?.code === 'ENOENT') throw notFound();
      throw e;
    }
  }

  async deleteKey(key: string) {
    await fs.rm(this.localPath(key), { force: true });
  }

  async deletePrefix(prefix: string) {
    await fs.rm(this.localPath(prefix), { recursive: true, force: true });
  }
}

export const hasCloudinaryConfig = () =>
  Boolean(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET));

@Injectable()
export class StorageService implements Driver {
  private readonly log = new Logger('Storage');
  private readonly driver: Driver;
  readonly kind: 'cloudinary' | 's3' | 'local';

  constructor() {
    if (hasCloudinaryConfig()) {
      this.kind = 'cloudinary';
      this.driver = new CloudinaryDriver();
      this.log.log('Using Cloudinary (authenticated delivery, no public URLs)');
    } else if (process.env.STORAGE_BUCKET) {
      this.kind = 's3';
      this.driver = new S3Driver();
      this.log.log(`Using private bucket "${process.env.STORAGE_BUCKET}"`);
    } else {
      this.kind = 'local';
      this.driver = new LocalDriver();
      this.log.warn('No Cloudinary or bucket configured: using the local ./storage folder (development only)');
    }
  }

  put(key: string, body: Buffer, contentType: string) {
    return this.driver.put(key, body, contentType);
  }
  get(key: string) {
    return this.driver.get(key);
  }
  deletePrefix(prefix: string) {
    return this.driver.deletePrefix(prefix);
  }
  deleteKey(key: string) {
    return this.driver.deleteKey(key);
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
