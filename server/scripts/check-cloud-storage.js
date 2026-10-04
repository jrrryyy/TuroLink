const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { uploadFile, deleteFile, streamDownload, isCloudConfigured, getProvider } = require('../services/cloudStorage');

async function run() {
  console.log('Testing Cloud Storage service...');

  // 1. In default environment (no cloud credentials), provider must be 'local'
  assert.equal(getProvider(), 'local');
  assert.equal(isCloudConfigured(), false);

  // 2. Test uploading a file buffer in local fallback mode
  const testBuffer = Buffer.from('Hello TuroLink Persistent Cloud Storage! ' + Date.now(), 'utf8');
  const uploadResult = await uploadFile(testBuffer, {
    folder: 'materials',
    filename: 'test-document.txt',
    mimetype: 'text/plain',
  });

  assert(uploadResult.url, 'Should return a URL');
  assert(uploadResult.key, 'Should return a key');
  assert.equal(uploadResult.provider, 'local');
  assert(fs.existsSync(uploadResult.localPath), 'File should exist on local disk in fallback mode');
  console.log('✅ File upload successful:', uploadResult.url);

  // 3. Test streaming download simulation
  let downloadedContent = Buffer.alloc(0);
  const mockRes = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    write(chunk) { downloadedContent = Buffer.concat([downloadedContent, chunk]); },
    end(chunk) { if (chunk) this.write(chunk); },
    download(filePath, name) {
      downloadedContent = fs.readFileSync(filePath);
      return downloadedContent;
    },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; },
  };

  await streamDownload(uploadResult.url, mockRes, 'test-document.txt', uploadResult.localPath);
  assert.equal(downloadedContent.toString(), testBuffer.toString(), 'Downloaded content should match original');
  console.log('✅ Stream download successful and verified');

  // 4. Test file deletion
  await deleteFile(uploadResult.localPath, { folder: 'materials' });
  assert(!fs.existsSync(uploadResult.localPath), 'File should be removed after deletion');
  console.log('✅ File cleanup successful');

  console.log('🎉 ALL CLOUD STORAGE TESTS PASSED!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
