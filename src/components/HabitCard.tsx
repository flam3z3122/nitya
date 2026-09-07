import {
  Check,
  Clock3,
  Flame,
  Trash2,
  CircleHelp,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Habit } from '@/types';
import { formatReminderTime, localDateKey } from '@/lib/activity';

type HabitCardProps = {
  habit: Habit;
  onToggle: (id: string, completed: boolean) => void;
  compact?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function HabitCard({
  habit,
  onToggle,
  compact = false,
  onDelete,
  onEdit,
}: HabitCardProps) {
  const handleDelete = () => {
    if (onDelete) onDelete(habit.id);
  };

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const idRef = useRef(
    `menu-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!open) return;

      const target = e.target as Node;

      if (menuRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;

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

    window.addEventListener(
      'overflow-menu-open',
      onOther as EventListener
    );

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    return () => {
      document.removeEventListener('click', onDoc);

      window.removeEventListener(
        'overflow-menu-open',
        onOther as EventListener
      );

      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]);

  return (
    <div
      className={`habit-card ${compact ? 'habit-card-compact' : ''
        }`}
    >
      <div className={`habit-icon habit-${habit.color}`}>
        {habit.icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="habit-name">{habit.name}</p>

        <div className="habit-meta">
          <span>{habit.frequency}</span>
          {habit.reminder_time && (
            <span className="habit-reminder">
              <Clock3 size={12} />
              {formatReminderTime(habit.reminder_time)}
            </span>
          )}

          <span className="streak">
            <Flame size={13} fill="currentColor" />
            {habit.streak} day streak
          </span>

          <span className="tooltip" aria-hidden>
            <CircleHelp size={14} />
            <span className="tooltip-text">
              Streak counts consecutive completed days ending today
              or the most recent completed day.
            </span>
          </span>
        </div>

        <div className="habit-history" aria-hidden>
          {(() => {
            const last7 = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return localDateKey(d);
            });

            return last7.map((date) => (
              <span
                key={date}
                className={`history-day ${habit.history.includes(date) ? 'done' : ''
                  }`}
              />
            ));
          })()}
        </div>
      </div>

      <button
        className={`habit-check ${habit.completed ? 'is-complete' : ''
          }`}
        onClick={() =>
          onToggle(habit.id, !habit.completed)
        }
        aria-label={`Mark ${habit.name} ${habit.completed ? 'incomplete' : 'complete'
          }`}
      >
        {habit.completed && (
          <Check size={17} strokeWidth={3} />
        )}
      </button>

      {!compact && (
        <div className="overflow-menu" ref={ref}>
          <button
            ref={buttonRef}
            type="button"
            className="icon-button small"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('overflow-menu-open', { detail: idRef.current }));
              setOpen((value) => !value);
            }}
            aria-label="More"
          >
            <MoreHorizontal size={16} />
          </button>
          {open && (
            <div className="menu" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onEdit?.(habit.id);
                }}
              >
                <span className="menu-icon">
                  <Pencil size={14} />
                </span>

                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();

                  setOpen(false);

                  handleDelete();
                }}
              >
                <span className="menu-icon">
                  <Trash2 size={14} />
                </span>

                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}