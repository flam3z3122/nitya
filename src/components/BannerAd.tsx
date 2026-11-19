import { useEffect, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import { isAndroid } from '@/lib/capacitor';
import { initializeAdMob, removeBanner, showBanner } from '@/lib/adMob';

export function BannerAd() {
  const [reserveSpace, setReserveSpace] = useState(false);

  useEffect(() => {
    if (!isAndroid()) return;

    let cancelled = false;
    const listeners: PluginListenerHandle[] = [];
    setReserveSpace(true);

    const removeListeners = async () => {
      await Promise.all(listeners.splice(0).map(async (listener) => {
        try {
          await listener.remove();
        } catch (error) {
          console.error('Could not remove an AdMob banner listener.', error);
        }
      }));
    };

    let bannerLoadStarted = false;
    const setup = async () => {
      try {
        await initializeAdMob();
        if (cancelled) return;

        const loadedListener = await AdMob.addListener(
          BannerAdPluginEvents.Loaded,
          () => {
            if (!cancelled) setReserveSpace(true);
          },
        );
        if (cancelled) {
          await loadedListener.remove();
          return;
        }
        listeners.push(loadedListener);

        const failedListener = await AdMob.addListener(
          BannerAdPluginEvents.FailedToLoad,
          (error) => {
            if (cancelled) return;
            console.warn('AdMob banner failed to load.', error);
            setReserveSpace(false);
            void removeListeners();
            void removeBanner().catch((removeError: unknown) => {
              console.error('Could not remove the failed AdMob banner.', removeError);
            });
          },
        );
        if (cancelled) {
          await failedListener.remove();
          return;
        }
        listeners.push(failedListener);

        if (cancelled) return;
        bannerLoadStarted = true;
        await showBanner();
      } catch (error) {
        await removeListeners();
        if (bannerLoadStarted) {
          await removeBanner().catch((removeError: unknown) => {
            console.error('Could not remove the AdMob banner after a load error.', removeError);
          });
        }
        if (!cancelled) {
          console.error('Could not initialize or show the AdMob banner.', error);
          setReserveSpace(false);
        }
      }
    };

    const setupPromise = setup();

    return () => {
      cancelled = true;
      setReserveSpace(false);
      void setupPromise
        .then(async () => {
          await removeListeners();
          await removeBanner();
        })
        .catch((error: unknown) => {
          console.error('Could not clean up the AdMob banner.', error);
        });
    };
  }, []);

  if (!isAndroid() || !reserveSpace) return null;

  return <div className="ad-banner-slot" aria-hidden="true" />;
}
