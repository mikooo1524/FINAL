// Run after exporting the web app to dist-test/customer-auth.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.resolve('node_modules/.cache/playwright');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve('dist-test/customer-auth');
  const mime = { '.js': 'application/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.png': 'image/png', '.ico': 'image/x-icon' };
  const server = http.createServer((request, response) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  let page;
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const click = text => page.getByText(text, { exact: true }).filter({ visible: true }).last().click();
    const email = `customer-${Date.now()}@example.test`;
    const password = 'UITestPassword123!';
    async function register(name, address) {
      await click('Continue as Customer');
      await click('Create an account');
      await page.getByLabel('Full name', { exact: true }).fill(name);
      await page.getByLabel('Contact number', { exact: true }).fill('09123456789');
      await page.getByLabel('Email', { exact: true }).fill(address);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByLabel('Confirm password', { exact: true }).fill(password);
      await click('Create an account');
      await page.getByText(`WELCOME, ${name.toUpperCase()}`, { exact: true }).waitFor({ timeout: 60000 });
    }
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await click('Continue as Customer');
    await page.getByRole('dialog', { name: 'Customer sign in' }).waitFor();
    await page.screenshot({ path: path.join(root, 'sign-in-popup.png') });
    await page.getByRole('button', { name: 'Close customer sign in', exact: true }).click();
    await page.getByRole('dialog', { name: 'Customer sign in' }).waitFor({ state: 'hidden' });
    await register('UI Test Customer', email);
    await click('Browse equipment');
    await page.getByTestId('equipment-catalog').getByText('Folding Tables', { exact: true }).click();
    await page.getByLabel('Quantity', { exact: true }).fill('2');
    await click('Add 2 to cart'); await click('View cart');
    await page.getByText('Review your equipment', { exact: true }).waitFor();
    await click('Home'); await click('Sign out');
    await click('Continue as Customer');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('incorrect');
    await click('Sign in');
    await page.getByText('Email or password is incorrect.', { exact: true }).waitFor({ timeout: 60000 });
    await page.getByLabel('Password', { exact: true }).fill(password); await click('Sign in');
    await page.getByText('WELCOME, UI TEST CUSTOMER', { exact: true }).waitFor({ timeout: 60000 });
    await click('Cart');
    await page.getByText('Review your equipment', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Folding Tables quantity', { exact: true }).inputValue(), '2');
    await click('Continue to booking');
    assert.equal(await page.getByLabel('Customer contact', { exact: true }).inputValue(), '09123456789');
    await click('Check availability'); await click('Continue to demo payment'); await click('Confirm reservation');
    await page.getByText('Reservation created!', { exact: true }).waitFor();
    await click('View My Rentals'); await page.getByText('Folding Tables', { exact: true }).filter({ visible: true }).last().waitFor();
    await click('Home'); await click('⇄ Switch demo role'); await click('Administrator');
    await page.getByText(/User directory/).last().click();
    await page.getByText('UI Test Customer', { exact: true }).filter({ visible: true }).last().waitFor();
    await page.getByText(`Email: ${email}`, { exact: true }).waitFor();
    await click('Dashboard'); await click('Bookings');
    await page.getByText('UI Test Customer', { exact: true }).filter({ visible: true }).last().waitFor();
    await click('Dashboard'); await click('⇄ Switch demo role'); await click('Continue as Customer');
    await click('Sign out');
    await register('Second UI Customer', `second-${email}`);
    await click('Cart'); await page.getByText('Your cart is empty', { exact: true }).waitFor();
    await click('My Rentals'); await page.getByText('No rentals yet', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Continue as Customer', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS registration, login errors, sign-out, persisted cart, booking ownership, Admin Users and customer isolation at mobile size');
  } catch (error) {
    if (page) {
      console.error('Page at failure:', (await page.locator('body').innerText()).slice(-2500));
      await page.screenshot({ path: path.join(root, 'auth-failure.png') });
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
