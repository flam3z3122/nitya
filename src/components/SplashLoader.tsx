import { Leaf } from 'lucide-react';

type SplashLoaderProps = {
  message: string;
};

export function SplashLoader({ message }: SplashLoaderProps) {
  return (
    <div className="splash-loader" role="status" aria-live="polite" aria-label={message}>
      <span className="splash-orb splash-orb-a" aria-hidden="true" />
      <span className="splash-orb splash-orb-b" aria-hidden="true" />
      <span className="splash-orb splash-orb-c" aria-hidden="true" />
      <div className="splash-center">
        <div className="splash-mark-wrap">
          <span className="splash-ring splash-ring-a" aria-hidden="true" />
          <span className="splash-ring splash-ring-b" aria-hidden="true" />
          <div className="splash-mark">
            <Leaf size={34} strokeWidth={2.15} />
          </div>
        </div>
        <p className="splash-wordmark">daymark</p>
        <p className="splash-caption">{message}</p>
        <div className="splash-bar" aria-hidden="true"><i /></div>
      </div>
    </div>
  );
}
