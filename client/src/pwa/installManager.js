const STORAGE_KEY = 'raahix-pwa-installed';

let deferredPrompt = null;
let prompting = false;
const listeners = new Set();

function emit() {
  const state = getInstallState();
  listeners.forEach((listener) => listener(state));
}

function readInstalledFlag() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeInstalledFlag(installed) {
  try {
    if (installed) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing can block storage. The prompt state still updates in memory.
  }
}

export function runningAsInstalledApp() {
  if (typeof window === 'undefined') return false;
  const installedDisplay = ['standalone', 'minimal-ui', 'fullscreen'].some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches
  );
  return installedDisplay || window.navigator.standalone === true;
}

export function getInstallState() {
  return {
    installed: runningAsInstalledApp() || readInstalledFlag(),
    canPrompt: Boolean(deferredPrompt),
  };
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function promptInstall() {
  const promptEvent = deferredPrompt;
  if (!promptEvent || prompting) return { outcome: 'unavailable' };

  prompting = true;
  deferredPrompt = null;

  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === 'accepted') writeInstalledFlag(true);
    return choice ?? { outcome: 'unavailable' };
  } catch {
    return { outcome: 'unavailable' };
  } finally {
    prompting = false;
    emit();
  }
}

function onBeforeInstallPrompt(event) {
  event.preventDefault();
  deferredPrompt = event;
  writeInstalledFlag(false);
  emit();
}

function onAppInstalled() {
  deferredPrompt = null;
  writeInstalledFlag(true);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit();
  });

  const standalone = window.matchMedia('(display-mode: standalone)');
  standalone.addEventListener?.('change', emit);

  // Vite's dev server skips the worker so hot reload is not served from cache.
  // Production builds, including local preview, still register the existing worker.
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

function browserInfo(nav) {
  const ua = nav.userAgent || '';
  const platform = nav.platform || '';
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && nav.maxTouchPoints > 1 && /Mobile/.test(ua));
  const android = /Android/i.test(ua);
  const edge = /Edg\//.test(ua) || /EdgiOS/.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);
  const chrome = /Chrome|Chromium|CriOS/i.test(ua) && !edge;
  const safari = /Safari/i.test(ua) && /Apple/i.test(nav.vendor || '') && !chrome && !edge && !firefox;
  return { ios, android, edge, firefox, chrome, safari };
}

export function getInstallInstructions(nav = typeof navigator === 'undefined' ? undefined : navigator) {
  const browser = browserInfo(
    nav || { userAgent: '', platform: '', vendor: '', maxTouchPoints: 0 }
  );

  if (browser.ios) {
    return {
      title: 'Add RaahiX to your Home Screen',
      intro: browser.safari
        ? 'Safari on iPhone and iPad does not show an automatic install prompt. Add the existing RaahiX app from the share menu:'
        : 'iPhone and iPad install RaahiX from Safari. Open this page in Safari, then:',
      steps: [
        'Tap the Share button in the Safari toolbar. It is the square with an arrow pointing up.',
        'Scroll the share sheet and tap Add to Home Screen.',
        'Leave the name as RaahiX and tap Add. The app opens from your Home Screen.',
      ],
    };
  }

  if (browser.safari) {
    return {
      title: 'Add RaahiX to your Dock',
      intro: 'Safari on Mac does not show the automatic install prompt. Add the existing RaahiX app from Safari:',
      steps: [
        'In the Safari menu bar, choose File, then Add to Dock.',
        'You can also click the Share button in the toolbar and choose Add to Dock.',
        'Click Add. RaahiX then opens from the Dock.',
      ],
    };
  }

  if (browser.android && browser.firefox) {
    return {
      title: 'Install RaahiX',
      intro: 'Firefox on Android installs the existing RaahiX app from the browser menu:',
      steps: [
        'Tap the menu button in Firefox.',
        'Tap Install or Add to Home screen.',
        'Confirm to add RaahiX to your home screen.',
      ],
    };
  }

  if (browser.firefox) {
    return {
      title: 'Install RaahiX',
      intro: 'Firefox on desktop does not offer an automatic install prompt for RaahiX.',
      steps: [
        'Open this site in Chrome, Edge, or Safari.',
        'Use Download App there, or the install icon in that browser’s address bar.',
      ],
    };
  }

  return {
    title: 'Install RaahiX',
    intro: 'This browser has not offered the install prompt yet. You can still install the existing RaahiX app:',
    steps: browser.android
      ? [
          'Open the browser menu.',
          'Tap Install app or Add to Home screen.',
          'Confirm to add RaahiX. If that choice is missing, refresh this page and tap Download App again.',
        ]
      : [
          'Select the install icon at the right side of the address bar.',
          browser.edge
            ? 'Or open the Edge menu, choose Apps, then Install RaahiX.'
            : 'Or open the browser menu and choose Install RaahiX.',
          'If the install choice is missing, refresh this page and tap Download App again.',
        ],
  };
}
