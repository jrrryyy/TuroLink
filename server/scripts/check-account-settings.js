require('dotenv').config({ quiet: true });
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { token, browserCookie, cleanup } = require('./test-session');
const express = require('express');
const User = require('../models/User');

async function main() {
  const users = []; let server, browser;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'turolink_integration_checks', serverSelectionTimeoutMS: 8000 });
    await User.init();
    for (const role of ['student', 'teacher']) users.push(await User.create({ emailVerifiedAt: new Date(), name: 'Settings Test', email: new mongoose.Types.ObjectId() + '@example.invalid', phone: '09' + require('crypto').randomInt(1000000000).toString().padStart(9, '0'), role, password: await bcrypt.hash('old-password', 10) }));
    const app = express(); app.use(express.json()); app.use('/api/auth', require('../routes/authRoutes'));
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    const call = async (user, body, method = 'PUT', route = '/api/auth/me') => {
      const multipart = body instanceof FormData;
      const response = await fetch(origin + route, { method, headers: { ...(user ? { Cookie: 'turolink_session=' + await token(user) } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=', 'base64');
    assert.equal((await call(null, { name: 'No Auth' })).status, 401);
    for (const user of users) {
      assert.equal((await call(user, { name: ' ', sex: 'invalid' })).status, 400);
      const updated = await call(user, { name: 'Updated Name', bio: 'My saved bio', sex: 'prefer-not-to-say', role: 'admin', phone: 'changed', email: 'changed@example.invalid', id: users.find((other) => other.id !== user.id).id });
      assert.equal(updated.status, 200); assert.equal(updated.body.user.role, user.role); assert.equal(updated.body.user.phone, user.phone); assert.equal(updated.body.user.email, user.email);
      assert.equal((await call(user, undefined, 'GET')).body.bio, 'My saved bio');
      assert(!('password' in updated.body.user)); assert(!('phoneKey' in updated.body.user));
      const wrong = await call(user, { name: 'Should Not Save', currentPassword: 'wrong', newPassword: 'Cedar!Orbit!Lantern38', confirmPassword: 'Cedar!Orbit!Lantern38' });
      assert.equal(wrong.status, 400); assert(wrong.body.errors.currentPassword);
      assert.equal((await call(user, undefined, 'GET')).body.name, 'Updated Name');
      assert.equal((await call(user, { name: 'Updated Name', currentPassword: 'old-password', newPassword: 'Cedar!Orbit!Lantern38', confirmPassword: 'different' })).status, 400);
      const badPhoto = new FormData(); badPhoto.append('name', 'Updated Name'); badPhoto.append('profilePicture', new Blob(['not an image'], { type: 'image/png' }), 'bad.png');
      assert.equal((await call(user, badPhoto)).status, 400);
      const photo = new FormData(); photo.append('name', 'Updated Name'); photo.append('profilePicture', new Blob([png], { type: 'image/png' }), 'avatar.png');
      const uploaded = await call(user, photo); assert.equal(uploaded.status, 200); assert(uploaded.body.user.profilePicture.startsWith('/uploads/avatars/'));
      assert.equal((await fetch(origin + uploaded.body.user.profilePicture)).status, 200);
      assert.equal((await call(user, { name: 'Updated Name', currentPassword: 'old-password', newPassword: 'Cedar!Orbit!Lantern38', confirmPassword: 'Cedar!Orbit!Lantern38' })).status, 200);
      assert.equal((await call(null, { email: user.email, password: 'old-password' }, 'POST', '/api/auth/login')).status, 401);
      assert.equal((await call(null, { email: user.email, password: 'Cedar!Orbit!Lantern38' }, 'POST', '/api/auth/login')).status, 200);
      const removed = await call(user, { name: 'Updated Name', removePicture: 'true' }); assert.equal(removed.body.user.profilePicture, '');
      assert.equal((await fetch(origin + uploaded.body.user.profilePicture)).status, 404);
    }
    console.log('PASS: both roles, profile persistence, immutable email/phone/role, password verification/change/login, image validation/upload/removal, authenticated access.');
    if (process.argv.includes('--browser')) {
      const { chromium } = require(path.join(process.env.TEMP, 'turolink-browser-check/node_modules/playwright'));
      browser = await chromium.launch({ channel: 'msedge', headless: true });
      for (const user of users) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
        await browserCookie(context, user); await context.addInitScript(() => localStorage.setItem('turolink-theme', 'dark'));
        const page = await context.newPage(); const errors = []; page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/api/**', async (route) => { const url = new URL(route.request().url()); const response = await route.fetch({ url: origin + url.pathname }); await route.fulfill({ response }); });
        await page.route('**/uploads/avatars/**', async (route) => { const response = await route.fetch({ url: origin + new URL(route.request().url()).pathname }); await route.fulfill({ response }); });
        await page.goto('http://localhost:5173/' + user.role + '/settings');
        await page.getByRole('heading', { name: 'Settings & Preferences' }).waitFor();
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('button', { name: 'Account Settings', exact: true }).click();
        await page.locator('input[name="name"]').fill('Browser Profile');
        await page.locator('textarea[name="bio"]').fill('Saved from the browser.');
        await page.getByRole('combobox', { name: 'Sex' }).selectOption('female');
        await page.getByLabel('Edit profile picture').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await page.getByRole('status').filter({ hasText: 'Changes saved' }).waitFor();
        assert.equal(await page.locator('.dashboard-layout-profile strong').textContent(), 'Browser Profile');
        await page.locator('.dashboard-layout-avatar img').waitFor();
        await page.reload(); await page.getByRole('heading', { name: 'Settings & Preferences' }).waitFor();
        assert.equal(await page.locator('textarea[name="bio"]').inputValue(), 'Saved from the browser.');
        await page.locator('input[name="currentPassword"]').fill('wrong');
        await page.locator('input[name="newPassword"]').fill('Birch!Ocean!Lantern49');
        await page.locator('input[name="confirmPassword"]').fill('Birch!Ocean!Lantern49');
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await page.locator('#currentPassword-error').waitFor();
        await page.locator('input[name="currentPassword"]').fill('Cedar!Orbit!Lantern38');
        await page.getByRole('button', { name: 'Save Changes' }).click();
        await page.getByRole('status').filter({ hasText: 'Changes saved' }).waitFor();
        assert.equal(await page.locator('input[name="newPassword"]').inputValue(), '');
        assert(await page.locator('.dark-dashboard-layout').count());
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(process.env.TEMP, user.role + '-account-settings.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        await context.close();
      }
      console.log('PASS: both settings pages, menu navigation, photo/name in topbar, reload persistence, password errors/success, dark mode, mobile layout, no browser errors.');
    }
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const user of users) {
      const saved = await User.findById(user._id);
      if (saved?.profilePicture && /^\/uploads\/avatars\/[a-f0-9-]+\.(png|jpg|webp)$/.test(saved.profilePicture)) await fs.unlink(path.join(__dirname, '../uploads/avatars', path.basename(saved.profilePicture))).catch(() => {});
      await User.deleteOne({ _id: user._id });
    }
    await cleanup(users);
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error('Account settings check failed:', error.name, ['AssertionError', 'TimeoutError'].includes(error.name) ? error.message : 'Check database/browser connectivity.'); process.exitCode = 1; });
