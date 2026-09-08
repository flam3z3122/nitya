import { useCallback, useEffect, useState } from 'react';
import type { Screen } from '@/types';

const VALID_SCREENS: Screen[] = ['today', 'tasks', 'habits', 'progress', 'profile'];
const LEGACY_SCREENS: Record<string, Screen> = { calendar: 'progress', statistics: 'progress', stats: 'progress' };

function parseHash(): Screen {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (VALID_SCREENS.includes(hash as Screen)) return hash as Screen;
  if (hash in LEGACY_SCREENS) return LEGACY_SCREENS[hash];
  return 'today';
}

export function useHashRoute(): [Screen, (screen: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(() => parseHash());

  useEffect(() => {
    const onHashChange = () => setScreen(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Screen) => {
    if (next === 'today') {
      if (window.location.hash) window.history.replaceState(null, '', '/');
    } else {
      window.location.hash = `#/${next}`;
    }
    setScreen(next);
  }, []);

  return [screen, navigate];
}
