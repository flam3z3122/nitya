import { ArrowUpRight, Flame } from 'lucide-react';

type ProgressCardProps = { completed: number; total: number };

export function ProgressCard({ completed, total }: ProgressCardProps) {
  const percentage = Math.round((completed / total) * 100);
  return (
    <section className="progress-card">
      <div className="progress-topline"><div><p className="eyebrow light">DAILY PROGRESS</p><h2>{percentage}% <span>complete</span></h2></div><div className="progress-icon"><Flame size={19} fill="currentColor" /></div></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${percentage}%` }} /></div>
      <div className="progress-bottomline"><span>{completed} of {total} tasks and habits</span><span className="progress-arrow"><ArrowUpRight size={15} /> On track</span></div>
    </section>
  );
}
