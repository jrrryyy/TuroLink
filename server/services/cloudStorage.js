const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');

// Configure Cloudinary dynamically and securely
let cloudinaryInstance = null;

function getCloudinary() {
  if (cloudinaryInstance) return cloudinaryInstance;
  try {
    const sdk = require('cloudinary').v2;
    const rawUrl = (process.env.CLOUDINARY_URL || '').trim().replace(/^["']|["']$/g, '');
    if (rawUrl) {
      const match = rawUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
      if (match) {
        sdk.config({
          cloud_name: match[3],
          api_key: match[1],
          api_secret: match[2],
          secure: true,
        });
      } else {
        sdk.config({ url: rawUrl, secure: true });
      }
      cloudinaryInstance = sdk;
    } else if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      sdk.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim().replace(/^["']|["']$/g, ''),
        api_key: process.env.CLOUDINARY_API_KEY.trim().replace(/^["']|["']$/g, ''),
        api_secret: process.env.CLOUDINARY_API_SECRET.trim().replace(/^["']|["']$/g, ''),
        secure: true,
      });
      cloudinaryInstance = sdk;
    }
  } catch (err) {
    console.warn('Cloudinary SDK initialization warning:', err.message);
  }
  return cloudinaryInstance;
}

// Configure Vercel Blob if token is present
let vercelBlob;
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    vercelBlob = require('@vercel/blob');
  }
} catch (e) {
  // Vercel Blob not loaded
}

function getProvider() {
  const c = getCloudinary();
  if (c) {
    const cfg = c.config();
    if (cfg.cloud_name && cfg.api_key && cfg.api_secret) {
      return 'cloudinary';
    }
  }
  if (vercelBlob && process.env.BLOB_READ_WRITE_TOKEN) {
    return 'vercel-blob';
  }
  return 'local';
}

function isCloudConfigured() {
  return getProvider() !== 'local';
}

const { getUploadPath } = require('../config/storage');

/**
 * Upload a file buffer to cloud storage (or local disk in fallback mode)
 */
async function uploadFile(buffer, options = {}) {
  const {
    folder = 'general',
    filename = 'file',
    mimetype = 'application/octet-stream',
    resourceType = 'auto',
  } = options;

  const provider = getProvider();
  const ext = path.extname(filename).toLowerCase() || '';
  const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_') || 'upload';
  const uniqueId = randomUUID();
  const uniqueName = `${baseName}_${uniqueId}${ext}`;

  if (provider === 'cloudinary') {
    try {
      const c = getCloudinary();
      return await new Promise((resolve, reject) => {
        // For images, use 'image'; for documents/audio/video or unknown, use 'auto' or 'raw'
        let resType = resourceType;
        if (resType === 'auto') {
          const isImage = mimetype.startsWith('image/');
          const isVideo = mimetype.startsWith('video/') || mimetype.startsWith('audio/');
          resType = isImage ? 'image' : isVideo ? 'video' : 'raw';
        }

        const publicId = resType === 'raw' ? `${baseName}_${uniqueId}${ext}` : `${baseName}_${uniqueId}`;
        const uploadOptions = {
          folder: `turolink/${folder}`,
          resource_type: resType,
          public_id: publicId,
          use_filename: true,
          unique_filename: true,
        };

        const stream = c.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            key: result.public_id,
            resourceType: result.resource_type || resType,
            size: result.bytes || buffer.length,
            originalName: filename,
            provider: 'cloudinary',
          });
        });

        Readable.from(buffer).pipe(stream);
      });
    } catch (cloudErr) {
      console.error('Cloudinary upload failed:', cloudErr.message || cloudErr);
      // If running on Vercel, production, or if cloud credentials were provided:
      // DO NOT silently fall back to ephemeral local disk, because files saved to /tmp
      // will be lost on the next request and cannot be downloaded across devices.
      const isCloudEnv = Boolean(
        process.env.VERCEL ||
        process.env.NODE_ENV === 'production' ||
        process.env.CLOUDINARY_URL ||
        process.env.CLOUDINARY_CLOUD_NAME
      );
      if (isCloudEnv) {
        throw new Error(
          `Cloud storage upload failed: ${cloudErr.message || 'Unable to upload file to cloud storage.'}`
        );
      }
      console.warn('Falling back to local disk in local development mode.');
    }
  }

  if (provider === 'vercel-blob') {
    try {
      const pathname = `turolink/${folder}/${uniqueName}`;
      const blob = await vercelBlob.put(pathname, buffer, {
        access: 'public',
        contentType: mimetype,
      });
      return {
        url: blob.url,
        key: blob.url,
        pathname: blob.pathname,
        size: buffer.length,
        originalName: filename,
        provider: 'vercel-blob',
      };
    } catch (blobErr) {
      console.error('Vercel Blob upload failed:', blobErr.message || blobErr);
      const isCloudEnv = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
      if (isCloudEnv) {
        throw new Error(`Cloud storage upload failed: ${blobErr.message}`);
      }
      console.warn('Falling back to local disk in local development mode.');
    }
  }

  // Warn if writing locally on serverless
  if (process.env.VERCEL) {
    console.warn(
      'WARNING: Writing to local disk on Vercel serverless environment. ' +
      'Files in /tmp are ephemeral and cannot be downloaded across sessions or devices. ' +
      'Ensure CLOUDINARY_URL is configured in Vercel project environment variables.'
    );
  }

  // Local disk fallback (using getUploadPath for serverless / local compatibility)
  const localDir = getUploadPath(folder);
  await fs.mkdir(localDir, { recursive: true });
  const localFilePath = path.join(localDir, uniqueName);
  await fs.writeFile(localFilePath, buffer);

  return {
    url: `/uploads/${folder}/${uniqueName}`,
    key: uniqueName,
    size: buffer.length,
    originalName: filename,
    localPath: localFilePath,
    provider: 'local',
  };
}

/**
 * Delete a file from cloud storage or local disk
 */
async function deleteFile(keyOrUrl, options = {}) {
  if (!keyOrUrl) return;
  const provider = getProvider();
  const { folder = '', resourceType = 'raw' } = options;

  try {
    if (provider === 'cloudinary' && !keyOrUrl.startsWith('/uploads/')) {
      const c = getCloudinary();
      const publicId = keyOrUrl.startsWith('http')
        ? extractCloudinaryPublicId(keyOrUrl, resourceType === 'raw')
        : keyOrUrl;
      if (publicId && c) {
        await c.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
        // Also attempt with 'image' and 'raw' in case resourceType differed
        if (resourceType === 'auto') {
          await c.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
          await c.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
        }
      }
      return;
    }

    if (provider === 'vercel-blob' && keyOrUrl.startsWith('http')) {
      await vercelBlob.del(keyOrUrl).catch(() => {});
      return;
    }

    // Local file cleanup
    let localPath = keyOrUrl;
    if (keyOrUrl.startsWith('/uploads/')) {
      localPath = path.resolve(__dirname, '..', keyOrUrl.slice(1));
    } else if (folder) {
      localPath = path.resolve(__dirname, `../uploads/${folder}`, path.basename(keyOrUrl));
    }
    if (fsSync.existsSync(localPath)) {
      await fs.unlink(localPath).catch(() => {});
    }
  } catch (err) {
    console.error('File cleanup non-fatal warning:', err.message);
  }
}

function extractCloudinaryPublicId(url, isRaw = false) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, ''); // strip version v12345/
    if (isRaw || url.includes('/raw/upload/')) {
      return afterUpload;
    }
    const lastDot = afterUpload.lastIndexOf('.');
    return lastDot > 0 ? afterUpload.slice(0, lastDot) : afterUpload;
  } catch {
    return null;
  }
}

/**
 * Stream download of a file to an Express response
 */
async function streamDownload(keyOrUrl, res, originalFilename = 'download', localFallbackPath = null) {
  const safeFilename = encodeURIComponent(originalFilename || 'Attachment').replace(/['()]/g, escape);

  // If it's a remote URL (Cloudinary or Vercel Blob)
  if (keyOrUrl && /^https?:\/\//i.test(keyOrUrl)) {
    try {
      const response = await fetch(keyOrUrl);
      if (!response.ok) {
        throw new Error(`Remote storage returned status ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
      );

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (response.body) {
        const nodeStream = Readable.fromWeb ? Readable.fromWeb(response.body) : Readable.from(response.body);
        return nodeStream.pipe(res);
      }
    } catch (err) {
      console.error('Remote download stream error:', err.message);
      // Fall through to local fallback if provided
    }
  }

  // Local fallback path
  if (localFallbackPath && fsSync.existsSync(localFallbackPath)) {
    return res.download(localFallbackPath, originalFilename);
  }

  // Attempt resolving from uploads
  if (keyOrUrl) {
    const resolvedPath = keyOrUrl.startsWith('/uploads/')
      ? path.resolve(__dirname, '..', keyOrUrl.slice(1))
      : null;
    if (resolvedPath && fsSync.existsSync(resolvedPath)) {
      return res.download(resolvedPath, originalFilename);
    }

    // If it was a local upload path that doesn't exist on disk (e.g. pre-cloud ephemeral file)
    if (typeof keyOrUrl === 'string' && keyOrUrl.startsWith('/uploads/')) {
      return res.status(404).json({
        message: 'This attachment was uploaded before cloud storage was connected and is no longer available on the server. Please edit the classwork or re-upload the file.',
      });
    }
  }

  return res.status(404).json({ message: 'Attachment file not found.' });
}

module.exports = {
  getProvider,
  isCloudConfigured,
  uploadFile,
  deleteFile,
  streamDownload,
};
