import { Target, Trash2, Pencil, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Goal } from '@/types';

type GoalCardProps = {
  goal: Goal;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function GoalCard({ goal, onDelete, onEdit }: GoalCardProps) {
  const handleDelete = () => { if (onDelete) onDelete(goal.id); };
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const idRef = useRef(`menu-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
      setMenuPos(null);
    };
    const onOther = (ev: Event) => {
      const otherId = (ev as CustomEvent).detail as string;
      if (otherId !== idRef.current) {
        setOpen(false);
        setMenuPos(null);
      }
    };
    const onResize = () => { setOpen(false); setMenuPos(null); };
    document.addEventListener('click', onDoc);
    window.addEventListener('overflow-menu-open', onOther as EventListener);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      document.removeEventListener('click', onDoc);
      window.removeEventListener('overflow-menu-open', onOther as EventListener);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]);
  return (
    <div className="goal-card">
      <span className="goal-icon"><Target size={18} /></span>
      <p className="goal-title">{goal.title}</p>
      <div className="overflow-menu" ref={ref}>
        <button ref={buttonRef} className="icon-button small" onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const menuWidth = 160;
          let left = rect.right - menuWidth + 8;
          if (left < 8) left = 8;
          if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
          const top = rect.bottom + 8;
          setMenuPos({ top, left });
          window.dispatchEvent(new CustomEvent('overflow-menu-open', { detail: idRef.current }));
          setOpen((v) => !v);
        }} aria-label="More"><MoreHorizontal size={16} /></button>
        {open && menuPos && (
          <div className="menu" ref={menuRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}>
            <button onClick={() => { setOpen(false); if (onEdit) onEdit(goal.id); }}>
              <span className="menu-icon"><Pencil size={14} /></span>
              <span>Edit</span>
            </button>
            <button onClick={() => { setOpen(false); handleDelete(); }}>
              <span className="menu-icon"><Trash2 size={14} /></span>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
