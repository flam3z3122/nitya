import { Browser } from '@capacitor/browser';
import { isNative } from '@/lib/capacitor';

function resolveUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).toString();
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