import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'raahix-banners-'));
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--hide-scrollbars',
  '--remote-debugging-port=9344',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

async function waitForVersion() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:9344/json/version');
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Chrome did not open a debugging port');
}

await waitForVersion();
const created = await fetch('http://127.0.0.1:9344/json/new?about:blank', { method: 'PUT' });
const target = await created.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener('message', (message) => {
  const payload = JSON.parse(message.data);
  if (!payload.id || !pending.has(payload.id)) return;
  const { resolve, reject } = pending.get(payload.id);
  pending.delete(payload.id);
  if (payload.error) reject(new Error(JSON.stringify(payload.error)));
  else resolve(payload.result);
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1080,
  height: 1350,
  deviceScaleFactor: 1,
  mobile: false,
});

const pageUrl = `file:///${dir.replace(/\\/g, '/')}/index.html`;
await send('Page.navigate', { url: pageUrl });
await evaluate(`new Promise((resolve) => {
  if (document.readyState === 'complete') resolve(true);
  else window.addEventListener('load', () => resolve(true), { once: true });
})`);
const fontsReady = await evaluate(`document.fonts.ready.then(() => document.fonts.check('800 120px Syne') && document.fonts.check('700 32px Manrope'))`);
const imageReady = await evaluate(`document.querySelector('#showcase img').complete && document.querySelector('#showcase img').naturalWidth > 0`);
if (!fontsReady || !imageReady) {
  throw new Error(`Assets not ready fonts=${fontsReady} image=${imageReady}`);
}

const overflow = await evaluate(`(() => {
  const problems = [];
  for (const banner of document.querySelectorAll('.banner')) {
    const limit = banner.getBoundingClientRect();
    for (const el of banner.querySelectorAll('h1, h2, h3, p, .cta, .url, .wordmark')) {
      const box = el.getBoundingClientRect();
      if (box.right > limit.right + 1 || box.left < limit.left - 1 || box.bottom > limit.bottom + 1) {
        problems.push(banner.id + ' ' + el.textContent.trim().slice(0, 40) + ' ' + Math.round(box.right) + '/' + Math.round(limit.right));
      }
    }
  }
  return problems;
})()`);
if (overflow.length) throw new Error('Clipped text: ' + overflow.join(' | '));

const files = [
  ['teaser', '01-teaser.png'],
  ['showcase', '02-showcase.png'],
  ['launch', '03-launch.png'],
];

for (const [id, name] of files) {
  const box = await evaluate(`(() => {
    const el = document.getElementById('${id}');
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  })()`);
  if (box.width !== 1080 || box.height !== 1350) {
    throw new Error(`${id} is ${box.width}x${box.height}`);
  }
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 },
    captureBeyondViewport: true,
  });
  await writeFile(join(dir, name), Buffer.from(shot.data, 'base64'));
  console.log(name, box);
}

socket.close();
chrome.kill();
await new Promise((resolve) => setTimeout(resolve, 400));
await rm(profile, { recursive: true, force: true }).catch(() => {});
