import { ArrowLeft } from 'lucide-react';
import { privacySections, privacyUpdated } from '@/content/privacy';

type PrivacyPolicyProps = {
  onBack: () => void;
};

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="page-content privacy-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">LEGAL</p>
          <h1>Privacy policy</h1>
        </div>
        <button type="button" className="icon-button" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
      </header>
      <p className="privacy-updated">Last updated {privacyUpdated}</p>
      {privacySections.map((section) => (
        <section key={section.title} className="privacy-section">
          <h2>{section.title}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
