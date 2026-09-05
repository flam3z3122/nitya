import { useEffect, useState } from 'react';
import { Download, Leaf, X } from 'lucide-react';

const DISMISS_KEY = 'daymark-install-dismissed';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    setVisible(false);
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
  };

  if (!visible) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install daymark">
      <span className="install-banner-mark" aria-hidden>
        <Leaf size={15} />
      </span>
      <div className="install-banner-copy">
        <strong>Install daymark</strong>
        <span>Add it to your home screen for quicker access.</span>
      </div>
      <button type="button" className="button button-dark install-banner-action" onClick={() => void install()}>
        <Download size={14} />
        Install
      </button>
      <button type="button" className="icon-button subtle" onClick={dismiss} aria-label="Dismiss install banner">
        <X size={16} />
      </button>
    </div>
  );
}
