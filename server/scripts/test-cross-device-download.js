require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const storage = require('../services/cloudStorage');

async function test() {
  console.log('--- Testing Cross-Device Download Flow ---');
  console.log('1. Checking Cloudinary Configuration:');
  const provider = storage.getProvider();
  const isCloud = storage.isCloudConfigured();
  console.log(`Provider: ${provider}, isCloudConfigured: ${isCloud}`);
  if (provider !== 'cloudinary') {
    throw new Error('Expected provider to be cloudinary');
  }

  console.log('\n2. Testing Cloud File Upload (simulating mobile upload):');
  // 1x1 transparent PNG buffer
  const sampleData = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const uploadResult = await storage.uploadFile(sampleData, {
    folder: 'materials',
    filename: 'phone_test_drawing.png',
    mimetype: 'image/png',
  });
  console.log('Upload Result (Image):');
  console.log(`URL: ${uploadResult.url}`);
  console.log(`Key: ${uploadResult.key}`);
  console.log(`Provider: ${uploadResult.provider}`);

  const docData = Buffer.from('%PDF-1.4 sample pdf content for syllabus');
  const docResult = await storage.uploadFile(docData, {
    folder: 'materials',
    filename: 'syllabus.pdf',
    mimetype: 'application/pdf',
  });
  console.log('Upload Result (Document):');
  console.log(`URL: ${docResult.url}`);
  console.log(`Key: ${docResult.key}`);
  console.log(`Provider: ${docResult.provider}`);

  if (!uploadResult.url.startsWith('https://res.cloudinary.com/')) {
    throw new Error('Upload did not return a Cloudinary CDN URL!');
  }

  console.log('\n3. Testing Cross-Device Download Streaming (simulating desktop download):');
  let streamHeaders = {};
  let streamedChunks = [];
  const fakeRes = {
    statusCode: 200,
    setHeader(k, v) { streamHeaders[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; },
    write(chunk) { streamedChunks.push(chunk); return true; },
    end(chunk) { if (chunk) streamedChunks.push(chunk); },
    on(event, cb) { return this; },
    once(event, cb) { return this; },
    emit(event, ...args) { return true; },
  };

  await storage.streamDownload(uploadResult.url, fakeRes, 'phone_test_drawing.png');
  console.log('Download Headers:');
  console.log('Content-Type:', streamHeaders['Content-Type']);
  console.log('Content-Disposition:', streamHeaders['Content-Disposition']);
  console.log('Content-Length:', streamHeaders['Content-Length']);

  console.log('\n4. Testing Legacy Missing Attachment Fallback:');
  const legacyRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; },
  };
  await storage.streamDownload('/uploads/materials/inbound7236429626274737784_missing.jpg', legacyRes, 'inbound7236429626274737784.jpg');
  console.log('Legacy 404 Status:', legacyRes.statusCode);
  console.log('Legacy 404 Message:', legacyRes.jsonData?.message);

  console.log('\n5. Cleaning up uploaded test files from Cloudinary:');
  await storage.deleteFile(uploadResult.key, { resourceType: 'image' });
  await storage.deleteFile(docResult.key, { resourceType: 'raw' });
  console.log('Cleanup complete!');

  console.log('\n--- All Cross-Device Download Tests Passed! ---');
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
