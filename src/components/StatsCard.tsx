import type { ReactNode } from 'react';

type StatsCardProps = { label: string; value: string; helper: string; icon: ReactNode; tone?: string };
export function StatsCard({ label, value, helper, icon, tone = 'green' }: StatsCardProps) { return <div className="stats-card"><div className={`stats-icon stats-${tone}`}>{icon}</div><p className="stats-label">{label}</p><strong>{value}</strong><span>{helper}</span></div>; }
