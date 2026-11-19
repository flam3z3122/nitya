import { useCallback, useEffect, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { isAndroid } from '@/lib/capacitor';
import { prepareInterstitial, showInterstitial } from '@/lib/adMob';

const INSTALL_SEEN_KEY = 'nitya.admob.interstitial.install-seen.v1';
const USAGE_KEY_PREFIX = 'nitya.admob.interstitial.usage.v1.';
const MAX_DAILY_INTERSTITIALS = 3;
const COOLDOWN_MS = 4 * 60 * 60 * 1000;
const IDLE_DELAY_MS = 8_000;

type InterstitialUsage = {
  localDay: string;
  shownToday: number;
  lastShownAt: number | null;
};

function getLocalDay(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidLocalDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getUsageKey(userId: string): string {
  return `${USAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
}

function readUsage(userId: string, now: Date): InterstitialUsage {
  const today = getLocalDay(now);
  const stored = window.localStorage.getItem(getUsageKey(userId));
  if (stored === null) return { localDay: today, shownToday: 0, lastShownAt: null };

  const value: unknown = JSON.parse(stored);
  if (
    typeof value !== 'object'
    || value === null
    || !('localDay' in value)
    || typeof value.localDay !== 'string'
    || !isValidLocalDay(value.localDay)
    || !('shownToday' in value)
    || typeof value.shownToday !== 'number'
    || !Number.isInteger(value.shownToday)
    || value.shownToday < 0
    || value.shownToday > MAX_DAILY_INTERSTITIALS
    || !('lastShownAt' in value)
    || (value.lastShownAt !== null && (typeof value.lastShownAt !== 'number' || !Number.isFinite(value.lastShownAt)))
  ) {
    throw new Error('Stored interstitial frequency data is invalid.');
  }

  const usage: InterstitialUsage = {
    localDay: value.localDay,
    shownToday: value.shownToday,
    lastShownAt: value.lastShownAt,
  };
  if (usage.localDay !== today) {
    return { localDay: today, shownToday: 0, lastShownAt: usage.lastShownAt };
  }
  return usage;
}

function writeUsage(userId: string, usage: InterstitialUsage): void {
  window.localStorage.setItem(getUsageKey(userId), JSON.stringify(usage));
}

function canShowUsage(usage: InterstitialUsage, now: Date): boolean {
  if (usage.shownToday >= MAX_DAILY_INTERSTITIALS) return false;
  return usage.lastShownAt === null || now.getTime() - usage.lastShownAt >= COOLDOWN_MS;
}

type Environment = {
  userId: string | null;
  workspaceReady: boolean;
  appActive: boolean;
};

export function useInterstitialAds(
  userId: string | null,
  workspaceReady: boolean,
  appActive: boolean,
): void {
  const [firstLaunchResolved, setFirstLaunchResolved] = useState(false);
  const firstLaunchRef = useRef<boolean | null>(null);
  const currentVisitRef = useRef(0);
  const wasActiveRef = useRef(false);
  const scheduledVisitRef = useRef(0);
  const attemptedVisitRef = useRef(0);
  const interactionVersionRef = useRef(0);
  const interactedVisitRef = useRef(0);
  const environmentRef = useRef<Environment>({ userId, workspaceReady, appActive });
  const adFlowInFlightRef = useRef(false);
  const showPendingRef = useRef(false);
  const storageUnavailableRef = useRef(false);
  const listenerHandlesRef = useRef<PluginListenerHandle[]>([]);

  environmentRef.current = { userId, workspaceReady, appActive };

  const removeAdListeners = useCallback(async () => {
    const handles = listenerHandlesRef.current.splice(0);
    await Promise.all(handles.map(async (handle) => {
      try {
        await handle.remove();
      } catch (error) {
        console.error('Could not remove an AdMob interstitial listener.', error);
      }
    }));
  }, []);

  useEffect(() => {
    if (!isAndroid()) return;

    if (firstLaunchRef.current === null) {
      try {
        firstLaunchRef.current = window.localStorage.getItem(INSTALL_SEEN_KEY) !== '1';
        if (firstLaunchRef.current) window.localStorage.setItem(INSTALL_SEEN_KEY, '1');
      } catch (error) {
        firstLaunchRef.current = true;
        storageUnavailableRef.current = true;
        console.error('Could not read or write the AdMob first-launch marker.', error);
      }
      setFirstLaunchResolved(true);
    }

    const recordInteraction = () => {
      interactionVersionRef.current += 1;
      interactedVisitRef.current = currentVisitRef.current;
    };
    window.addEventListener('pointerdown', recordInteraction, true);
    window.addEventListener('touchstart', recordInteraction, true);
    window.addEventListener('click', recordInteraction, true);
    window.addEventListener('keydown', recordInteraction, true);

    return () => {
      window.removeEventListener('pointerdown', recordInteraction, true);
      window.removeEventListener('touchstart', recordInteraction, true);
      window.removeEventListener('click', recordInteraction, true);
      window.removeEventListener('keydown', recordInteraction, true);
      void removeAdListeners();
    };
  }, [removeAdListeners]);

  useEffect(() => {
    if (!isAndroid()) return;
    if (appActive) {
      if (!wasActiveRef.current) currentVisitRef.current += 1;
      wasActiveRef.current = true;
    } else {
      wasActiveRef.current = false;
    }
  }, [appActive]);

  useEffect(() => () => {
    void removeAdListeners();
  }, [removeAdListeners]);

  const attemptInterstitial = useCallback(async (
    expectedUserId: string,
    visit: number,
    expectedInteractionVersion: number,
  ): Promise<void> => {
    const isCurrentVisit = () => {
      const environment = environmentRef.current;
      return environment.appActive
        && environment.workspaceReady
        && environment.userId === expectedUserId
        && currentVisitRef.current === visit
        && interactionVersionRef.current === expectedInteractionVersion
        && interactedVisitRef.current !== visit;
    };

    if (!isCurrentVisit() || !navigator.onLine || adFlowInFlightRef.current) return;

    const now = new Date();
    try {
      if (!canShowUsage(readUsage(expectedUserId, now), now)) return;
    } catch (error) {
      storageUnavailableRef.current = true;
      console.error('Could not check AdMob interstitial eligibility.', error);
      return;
    }

    adFlowInFlightRef.current = true;
    try {
      await prepareInterstitial();
      if (!isCurrentVisit() || !navigator.onLine) return;

      const eligibilityTime = new Date();
      let usage: InterstitialUsage;
      try {
        usage = readUsage(expectedUserId, eligibilityTime);
        if (!canShowUsage(usage, eligibilityTime)) return;
      } catch (error) {
        storageUnavailableRef.current = true;
        console.error('Could not recheck AdMob interstitial eligibility.', error);
        return;
      }

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        showPendingRef.current = false;
        adFlowInFlightRef.current = false;
        void removeAdListeners();
      };

      const showedListener = await AdMob.addListener(
        InterstitialAdPluginEvents.Showed,
        () => {
          const shownAt = new Date();
          try {
            const currentUsage = readUsage(expectedUserId, shownAt);
            writeUsage(expectedUserId, {
              ...currentUsage,
              shownToday: Math.min(currentUsage.shownToday + 1, MAX_DAILY_INTERSTITIALS),
              lastShownAt: shownAt.getTime(),
            });
          } catch (error) {
            storageUnavailableRef.current = true;
            console.error('Could not save AdMob interstitial frequency data.', error);
          }
        },
      );
      listenerHandlesRef.current.push(showedListener);

      const failedListener = await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToShow,
        (error) => {
          console.warn('AdMob interstitial failed to show.', error);
          finish();
        },
      );
      listenerHandlesRef.current.push(failedListener);

      const dismissedListener = await AdMob.addListener(
        InterstitialAdPluginEvents.Dismissed,
        finish,
      );
      listenerHandlesRef.current.push(dismissedListener);

      if (!isCurrentVisit() || !navigator.onLine) {
        finish();
        return;
      }

      showPendingRef.current = true;
        await showInterstitial();
    } catch (error) {
      console.warn('AdMob interstitial is unavailable.', error);
      showPendingRef.current = false;
      await removeAdListeners();
    } finally {
      if (!showPendingRef.current) adFlowInFlightRef.current = false;
    }
  }, [removeAdListeners]);

  useEffect(() => {
    if (
      !isAndroid()
      || !appActive
      || !firstLaunchResolved
      || firstLaunchRef.current !== false
      || !workspaceReady
      || !userId
      || storageUnavailableRef.current
    ) return;

    const visit = currentVisitRef.current;
    if (
      visit === 0
      || scheduledVisitRef.current === visit
      || attemptedVisitRef.current === visit
      || interactedVisitRef.current === visit
    ) return;

    scheduledVisitRef.current = visit;
    const interactionVersion = interactionVersionRef.current;
    const timeout = window.setTimeout(() => {
      attemptedVisitRef.current = visit;
      void attemptInterstitial(userId, visit, interactionVersion);
    }, IDLE_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
      if (attemptedVisitRef.current !== visit && scheduledVisitRef.current === visit) {
        scheduledVisitRef.current = 0;
      }
    };
  }, [appActive, attemptInterstitial, firstLaunchResolved, userId, workspaceReady]);
}
