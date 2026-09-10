type OfflineBannerProps = {
  offline: boolean;
  pendingSync: number;
  online: boolean;
};

export function OfflineBanner({ offline, pendingSync, online }: OfflineBannerProps) {
  if (!offline && pendingSync === 0) return null;

  const message = !online || offline
    ? 'You’re offline. Changes are saved on this device.'
    : pendingSync > 0
      ? 'Syncing your changes…'
      : '';

  if (!message) return null;

  return (
    <div className={`offline-banner ${online && pendingSync > 0 ? 'is-syncing' : ''}`} role="status">
      {message}
    </div>
  );
}
