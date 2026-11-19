import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from '@capacitor-community/admob';

const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';
const TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';
const PRODUCTION_BANNER_AD_UNIT_ID = 'ca-app-pub-7095801339633962/3953647241';
const PRODUCTION_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-7095801339633962/6200683391';
const IS_ADMOB_TEST_MODE = import.meta.env.MODE !== 'production';
const BANNER_AD_UNIT_ID = IS_ADMOB_TEST_MODE ? TEST_BANNER_AD_UNIT_ID : PRODUCTION_BANNER_AD_UNIT_ID;
const INTERSTITIAL_AD_UNIT_ID = IS_ADMOB_TEST_MODE ? TEST_INTERSTITIAL_AD_UNIT_ID : PRODUCTION_INTERSTITIAL_AD_UNIT_ID;

let initialization: Promise<void> | undefined;
let bannerOperation: Promise<void> = Promise.resolve();

function enqueueBannerOperation(operation: () => Promise<void>): Promise<void> {
  const result = bannerOperation.then(operation, operation);
  bannerOperation = result.catch(() => {});
  return result;
}

export function initializeAdMob(): Promise<void> {
  initialization ??= AdMob.initialize({ initializeForTesting: IS_ADMOB_TEST_MODE }).catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

export function showBanner(): Promise<void> {
  return enqueueBannerOperation(async () => {
    await initializeAdMob();
    await AdMob.showBanner({
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.TOP_CENTER,
      isTesting: IS_ADMOB_TEST_MODE,
    });
  });
}

export function removeBanner(): Promise<void> {
  return enqueueBannerOperation(() => AdMob.removeBanner());
}

export async function prepareInterstitial(): Promise<void> {
  await initializeAdMob();
  await AdMob.prepareInterstitial({
    adId: INTERSTITIAL_AD_UNIT_ID,
    isTesting: IS_ADMOB_TEST_MODE,
  });
}

export function showInterstitial(): Promise<void> {
  return AdMob.showInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID });
}
