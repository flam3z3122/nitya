import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { isAndroid } from '@/lib/capacitor';
import { consumeNativeBack } from '@/lib/backHandler';

export type Screen = 'today' | 'tasks' | 'habits' | 'progress' | 'profile';

const SCREEN_ORDER: Screen[] = ['today', 'tasks', 'habits', 'progress', 'profile'];

function previousScreen(current: Screen): Screen {
  const index = SCREEN_ORDER.indexOf(current);
  if (index <= 0) return current;
  return SCREEN_ORDER[index - 1];
}

export function useAndroidBackButton(currentScreen: Screen, navigate: (screen: Screen) => void) {
  useEffect(() => {
    if (!isAndroid()) return;

    const listener = App.addListener('backButton', () => {
      if (consumeNativeBack()) return;
      const previous = previousScreen(currentScreen);
      if (previous !== currentScreen) {
        navigate(previous);
      } else {
        void App.exitApp();
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [currentScreen, navigate]);
}