import { ArrowUpRight, Flame } from 'lucide-react';

type ProgressCardProps = { completed: number; total: number };

export function ProgressCard({ completed, total }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - percentage / 100);
  return (
    <section className="progress-card">
      <div className="progress-topline">
        <div>
          <p className="eyebrow light">DAILY PROGRESS</p>
          <h2>{percentage}% <span>complete</span></h2>
        </div>
        <div className="progress-icon"><Flame size={19} fill="currentColor" /></div>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
      <div className="progress-bottomline">
        <span>{completed} of {total} tasks and habits</span>
        <span className="progress-arrow"><ArrowUpRight size={15} /> On track</span>
      </div>

      <div className="progress-mobile-banner">
        <div className="progress-mobile-ring-wrap">
          <svg className="progress-mobile-ring" viewBox="0 0 64 64" width="56" height="56">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff30" strokeWidth="5" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="#dceccb" strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset .5s ease' }} />
          </svg>
          <div className="progress-mobile-ring-text">
            <strong>{percentage}%</strong>
          </div>
        </div>
        <div className="progress-mobile-info">
          <p className="eyebrow light">DAILY PROGRESS</p>
          <strong>{completed} of {total}</strong>
          <span>tasks &amp; habits done</span>
        </div>
        <div className="progress-mobile-flame">
          <Flame size={22} fill="currentColor" />
        </div>
      </div>
    </section>
  );
}
