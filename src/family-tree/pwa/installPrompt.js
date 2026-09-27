/**
 * "Install app" support. Chrome/Edge/Android fire `beforeinstallprompt` when
 * the site can be installed; we keep the event so a menu item can show the
 * install dialog later. iPhone has no such event (Share → Add to Home Screen).
 */

let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(Boolean(deferred)));

export function initInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export const canInstall = () => Boolean(deferred);

export function onInstallAvailability(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  emit();
  await e.prompt();
  const choice = await e.userChoice.catch(() => null);
  return choice?.outcome === 'accepted';
}

/** Register the service worker (production builds only). */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker not registered:', err));
  });
}
