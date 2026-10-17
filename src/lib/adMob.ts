import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

let initialization: Promise<void> | undefined;
let bannerOperation: Promise<void> = Promise.resolve();

function enqueueBannerOperation(operation: () => Promise<void>): Promise<void> {
  const result = bannerOperation.then(operation, operation);
  bannerOperation = result.catch(() => {});
  return result;
}

export function initializeAdMob(): Promise<void> {
  initialization ??= AdMob.initialize({ initializeForTesting: true }).catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

export function showTestBanner(): Promise<void> {
  return enqueueBannerOperation(async () => {
    await initializeAdMob();
    await AdMob.showBanner({
      adId: TEST_BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.TOP_CENTER,
      isTesting: true,
    });
  });
}

export function removeBanner(): Promise<void> {
  return enqueueBannerOperation(() => AdMob.removeBanner());
}

export async function prepareTestInterstitial(): Promise<void> {
  await initializeAdMob();
  await AdMob.prepareInterstitial({
    adId: TEST_INTERSTITIAL_AD_UNIT_ID,
    isTesting: true,
  });
}

export function showTestInterstitial(): Promise<void> {
  return AdMob.showInterstitial({ adId: TEST_INTERSTITIAL_AD_UNIT_ID });
}
