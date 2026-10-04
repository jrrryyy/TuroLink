const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Readable } = require('node:stream');

// Configure Cloudinary if credentials are present
let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
  if (process.env.CLOUDINARY_URL) {
    // CLOUDINARY_URL automatically parsed by SDK
  } else if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
} catch (e) {
  // Cloudinary module not loaded
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
  if (
    cloudinary &&
    (process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET))
  ) {
    return 'cloudinary';
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

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
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
      console.warn('Cloudinary upload failed, gracefully falling back to disk:', cloudErr.message);
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
      console.warn('Vercel Blob upload failed, gracefully falling back to disk:', blobErr.message);
    }
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
      const publicId = keyOrUrl.startsWith('http')
        ? extractCloudinaryPublicId(keyOrUrl)
        : keyOrUrl;
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
        // Also attempt with 'image' and 'raw' in case resourceType differed
        if (resourceType === 'auto') {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }).catch(() => {});
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
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

function extractCloudinaryPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, ''); // strip version v12345/
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

      const reader = response.body.getReader();
      const nodeStream = new Readable({
        async read() {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        },
      });

      return nodeStream.pipe(res);
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
