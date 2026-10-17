const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '../src/webDatabaseLock.js'), 'utf8')
  .replace('export function', 'function');

function createPage(navigator) {
  const page = vm.createContext({ navigator });
  vm.runInContext(source, page);
  return page;
}

test('a page reuses its lock across repeated calls and Fast Refresh', async () => {
  let requests = 0;
  const page = createPage({ locks: { request: (_name, callback) => {
    requests += 1;
    return callback();
  } } });
  const first = page.waitForWebDatabaseLock();
  await first;
  vm.runInContext(source, page);
  assert.equal(page.waitForWebDatabaseLock(), first);
  assert.equal(requests, 1);
});

test('a second page waits until the browser releases the first page lock', async () => {
  const queue = [];
  const navigator = { locks: { request: (name, callback) => {
    queue.push({ name, callback });
    if (queue.length === 1) return callback();
    return new Promise(() => {});
  } } };
  const firstPage = createPage(navigator);
  const secondPage = createPage(navigator);
  await firstPage.waitForWebDatabaseLock();
  let secondReady = false;
  const second = secondPage.waitForWebDatabaseLock().then(() => { secondReady = true; });
  await Promise.resolve();
  assert.equal(secondReady, false);
  assert.equal(queue[0].name, queue[1].name);

  // Simulate the browser granting the queued lock after the first page exits.
  queue[1].callback();
  await second;
  assert.equal(secondReady, true);
});

test('browsers without Web Locks can still attempt to open SQLite', async () => {
  await createPage({}).waitForWebDatabaseLock();
});

test('lock failures reject so the recovery UI can handle them', async () => {
  const error = new Error('Lock request failed');
  const page = createPage({ locks: { request: () => Promise.reject(error) } });
  await assert.rejects(page.waitForWebDatabaseLock(), error);
});
