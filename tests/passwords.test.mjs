import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../src/passwords.js';

test('new password records use independent salts and reject incorrect passwords', async () => {
  const first = await hashPassword('TestPassword123!');
  const second = await hashPassword('TestPassword123!');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('TestPassword123!', first), true);
  assert.equal(await verifyPassword('wrong', first), false);
  assert.equal(await verifyPassword('wrong', dummyPasswordHash), false);
});

test('passwords beyond 72 UTF-8 bytes retain their full value', async () => {
  const prefix = '🎪'.repeat(24);
  const record = await hashPassword(prefix + 'first');
  assert.equal(await verifyPassword(prefix + 'first', record), true);
  assert.equal(await verifyPassword(prefix + 'second', record), false);
});

test('invalid records are rejected without expensive or unbounded work', async () => {
  for (const record of [null, '', 'bcrypt-hmac-sha256$$2b$31$' + '.'.repeat(53), 'pbkdf2-sha256$999999999$salt$hash']) {
    assert.equal(await verifyPassword('password', record), false);
  }
});

test('legacy verification works in Expo Go without Web Crypto', async () => {
  const password = 'LegacyPassword123!';
  const salt = '0123456789abcdef0123456789abcdef';
  const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 600000, 32, 'sha256').toString('hex');
  const record = `pbkdf2-sha256$600000$${salt}$${hash}`;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    assert.equal(await verifyPassword(password, record), true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
});
