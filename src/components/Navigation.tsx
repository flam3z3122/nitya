import { BarChart3, CalendarDays, CheckSquare, CircleUserRound, Leaf } from 'lucide-react';
import type { Screen } from '@/types';

type NavigationProps = { active: Screen; onChange: (screen: Screen) => void; userEmail?: string };

const items: { id: Screen; label: string; icon: typeof CheckSquare }[] = [
  { id: 'today', label: 'Today', icon: CheckSquare }, { id: 'habits', label: 'Habits', icon: Leaf }, { id: 'calendar', label: 'Calendar', icon: CalendarDays }, { id: 'statistics', label: 'Stats', icon: BarChart3 }, { id: 'profile', label: 'Profile', icon: CircleUserRound },
];

export function Navigation({ active, onChange, userEmail }: NavigationProps) {
  const initials = (userEmail?.[0] ?? 'A').toUpperCase();
  return <>
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Leaf size={18} /></div><span>daymark</span></div><nav className="sidebar-nav">{items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onChange(id)}><Icon size={19} /><span>{label}</span>{active === id && <i />}</button>)}</nav><div className="sidebar-note"><div className="note-icon"><Leaf size={16} /></div><p>Small steps,<br /><strong>lasting change.</strong></p></div><div className="sidebar-user"><div className="avatar avatar-small">{initials}</div><div><p>{userEmail ?? 'Your workspace'}</p><span>Personal space</span></div></div></aside>
    <nav className="bottom-nav">{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
  </>;
}
