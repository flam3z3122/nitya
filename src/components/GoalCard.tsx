import { MoreHorizontal, Pencil, Target, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Goal } from '@/types';

type GoalCardProps = {
  goal: Goal;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function GoalCard({ goal, onDelete, onEdit }: GoalCardProps) {
  const handleDelete = () => {
    if (onDelete) onDelete(goal.id);
  };
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const idRef = useRef(`menu-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
    };
    const onOther = (ev: Event) => {
      const otherId = (ev as CustomEvent).detail as string;
      if (otherId !== idRef.current) {
        setOpen(false);
      }
    };
    const onResize = () => {
      setOpen(false);
    };
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
        <button
          ref={buttonRef}
          type="button"
          className="icon-button small"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('overflow-menu-open', { detail: idRef.current }));
            setOpen((v) => !v);
          }}
          aria-label="More"
        >
          <MoreHorizontal size={16} />
        </button>
        {open && (
          <div className="menu" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit?.(goal.id);
              }}
            >
              <span className="menu-icon"><Pencil size={14} /></span>
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                handleDelete();
              }}
            >
              <span className="menu-icon"><Trash2 size={14} /></span>
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
