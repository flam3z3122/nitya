import { BarChart3, CheckSquare, CircleUserRound, ListChecks, Sprout } from 'lucide-react';
import type { Screen } from '@/types';

type NavigationProps = { active: Screen; onChange: (screen: Screen) => void; userEmail?: string };

const items: { id: Screen; label: string; icon: typeof CheckSquare }[] = [
  { id: 'today', label: 'Today', icon: CheckSquare },
  { id: 'habits', label: 'Habits', icon: Sprout },
  { id: 'tasks', label: 'Tasks', icon: ListChecks },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
];

export function Navigation({ active, onChange, userEmail }: NavigationProps) {
  const initials = (userEmail?.[0] ?? 'A').toUpperCase();
  return <>
    <aside className="sidebar"><div className="brand"><div className="brand-mark has-logo"><img className="logo-light" src="/icons/nitya-mark-light.png" alt="Nitya" draggable={false} /><img className="logo-dark" src="/icons/nitya-mark-dark.png" alt="" aria-hidden="true" draggable={false} /></div><span>Nitya</span></div><nav className="sidebar-nav">{items.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => onChange(id)}><Icon size={19} /><span>{label}</span>{active === id && <i />}</button>)}</nav><div className="sidebar-note"><div className="note-icon"><Sprout size={16} /></div><p>Small habits.<br /><strong>Every day.</strong></p></div><div className="sidebar-user"><div className="avatar avatar-small">{initials}</div><div><p>{userEmail ?? 'Your workspace'}</p><span>Personal space</span></div></div></aside>
    <nav className="bottom-nav">{items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
  </>;
}
