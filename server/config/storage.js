const path = require('path');
const fs = require('fs');

const isVercel = Boolean(process.env.VERCEL);

function getUploadPath(...subpaths) {
  const dir = isVercel
    ? path.join('/tmp', 'uploads', ...subpaths)
    : path.join(__dirname, '..', 'uploads', ...subpaths);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // Ignore read-only errors on serverless environments
  }
  return dir;
}

function getStoragePath(...subpaths) {
  const dir = isVercel
    ? path.join('/tmp', 'storage', ...subpaths)
    : path.join(__dirname, '..', 'storage', ...subpaths);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {
    // Ignore read-only errors on serverless environments
  }
  return dir;
}

module.exports = {
  isVercel,
  getUploadPath,
  getStoragePath,
};
