import { useEffect, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { isNative } from '@/lib/capacitor';

export function useKeyboardViewport(open: boolean) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const viewport = window.visualViewport;

    const apply = () => {
      const layoutHeight = window.innerHeight;
      const visibleHeight = viewport?.height ?? layoutHeight;
      const visibleTop = viewport?.offsetTop ?? 0;
      const bottomGap = Math.max(0, layoutHeight - (visibleTop + visibleHeight));
      root.style.setProperty('--keyboard-offset', `${Math.round(bottomGap)}px`);
      root.style.setProperty('--keyboard-top', `${Math.round(visibleTop + 12)}px`);
      root.style.setProperty('--keyboard-visible-height', `${Math.round(visibleHeight)}px`);
      root.style.setProperty('--keyboard-visible-top', `${Math.round(visibleTop)}px`);
      if (!isNative()) setKeyboardOpen(bottomGap > 120);
    };

    apply();
    viewport?.addEventListener('resize', apply);
    viewport?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);

    let cancelled = false;
    const listeners: PluginListenerHandle[] = [];
    if (isNative()) {
      void Promise.all([
        Keyboard.addListener('keyboardWillShow', () => { if (!cancelled) setKeyboardOpen(true); }),
        Keyboard.addListener('keyboardWillHide', () => { if (!cancelled) setKeyboardOpen(false); }),
      ]).then((handles) => {
        if (cancelled) handles.forEach((handle) => void handle.remove());
        else listeners.push(...handles);
      });
    }

    return () => {
      cancelled = true;
      viewport?.removeEventListener('resize', apply);
      viewport?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      listeners.forEach((handle) => void handle.remove());
      root.style.removeProperty('--keyboard-offset');
      root.style.removeProperty('--keyboard-top');
      root.style.removeProperty('--keyboard-visible-height');
      root.style.removeProperty('--keyboard-visible-top');
      setKeyboardOpen(false);
    };
  }, [open]);

  return keyboardOpen;
}
