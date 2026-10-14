type OfflineBannerProps = {
  offline: boolean;
  pendingSync: number;
  online: boolean;
  syncing: boolean;
  syncFailure: 'network' | 'permanent' | null;
  onRetry: () => void;
};

export function OfflineBanner({ offline, pendingSync, online, syncing, syncFailure, onRetry }: OfflineBannerProps) {
  if (!offline && pendingSync === 0 && !syncFailure) return null;

  let message = '';
  if (syncFailure === 'permanent') {
    message = "A saved change couldn't be synced. It's still on this device. Fix the issue, then retry.";
  } else if (syncFailure === 'network') {
    message = "Couldn't sync your changes. They're still saved on this device. Check your connection and retry.";
  } else if (!online || offline) {
    message = 'You’re offline. Changes are saved on this device.';
  } else if (syncing) {
    message = 'Syncing your changes…';
  } else if (pendingSync > 0) {
    message = 'Changes are waiting to sync.';
  }

  if (!message) return null;

  return (
    <div className={`offline-banner ${syncFailure ? 'has-sync-error' : ''} ${online && syncing ? 'is-syncing' : ''}`} role={syncFailure ? 'alert' : 'status'}>
      <span>{message}</span>
      {syncFailure && <button type="button" className="offline-banner-retry" onClick={onRetry}>Retry sync</button>}
    </div>
  );
}
