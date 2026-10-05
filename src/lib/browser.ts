import { Browser } from '@capacitor/browser';
import { isNative } from '@/lib/capacitor';

/** Canonical hosted site. Used on native, where the WebView origin is http://localhost. */
export const WEBSITE_URL = 'https://todayshabit.netlify.app';

function resolveUrl(url: string): string {
  // On Capacitor the WebView is served from http://localhost, so a relative
  // path would resolve to a localhost URL that is broken outside the app.
  const base = isNative() ? WEBSITE_URL : window.location.origin;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export async function openExternal(url: string): Promise<void> {
  const target = resolveUrl(url);
  if (isNative()) {
    await Browser.open({ url: target });
    return;
  }
  window.open(target, '_blank', 'noopener,noreferrer');
}