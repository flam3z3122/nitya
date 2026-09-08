import {
  Ban,
  CalendarCheck,
  Check,
  Clock3,
  Flame,
  Trash2,
  CircleHelp,
  Pencil,
  MoreHorizontal,
  Undo2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Habit } from '@/types';
import { formatReminderTime, catchUpFor, isWeeklyHabit, localDateKey, previousPeriodDone, previousPeriodSkipped } from '@/lib/activity';

type HabitCardProps = {
  habit: Habit;
  onToggle: (id: string, completed: boolean) => void;
  compact?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onMarkPrevious?: (id: string) => void;
  onSkipPrevious?: (id: string) => void;
  onUndoSkip?: (id: string) => void;
};

export function HabitCard({
  habit,
  onToggle,
  compact = false,
  onDelete,
  onEdit,
  onMarkPrevious,
  onSkipPrevious,
  onUndoSkip,
}: HabitCardProps) {
  const handleDelete = () => {
    if (onDelete) onDelete(habit.id);
  };

  const skips = habit.skips ?? [];
  const catchUp = catchUpFor(habit.frequency);
  const skipped = previousPeriodSkipped(skips, habit.frequency);
  const missed = !previousPeriodDone(habit) && !skipped;

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
            {habit.streak} {isWeeklyHabit(habit.frequency) ? 'week' : 'day'} streak
          </span>

          <span className="tooltip" aria-hidden>
            <CircleHelp size={14} />
            <span className="tooltip-text">
              {isWeeklyHabit(habit.frequency)
                ? 'Weekly habits count once per week. Streak is consecutive weeks with a check-in.'
                : 'Streak counts consecutive completed days ending today or yesterday.'}
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
                className={`history-day ${habit.history.includes(date) ? 'done' : skips.includes(date) ? 'skipped' : ''}`}
              />
            ));
          })()}
        </div>

        {(() => {
          if (!missed && !skipped) return null;
          return (
            <div className="habit-catchup">
              {skipped ? (
                <>
                  <span>Skipped {catchUp.label}</span>
                  {onUndoSkip && <button type="button" onClick={() => onUndoSkip(habit.id)}>Undo</button>}
                </>
              ) : (
                <>
                  <span>Missed {catchUp.label}</span>
                  {onMarkPrevious && <button type="button" onClick={() => onMarkPrevious(habit.id)}>Mark done</button>}
                  {onSkipPrevious && <button type="button" onClick={() => onSkipPrevious(habit.id)}>Skip</button>}
                </>
              )}
            </div>
          );
        })()}
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
              {missed && onMarkPrevious && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onMarkPrevious(habit.id);
                  }}
                >
                  <span className="menu-icon"><CalendarCheck size={14} /></span>
                  <span>Mark {catchUp.label}</span>
                </button>
              )}
              {missed && onSkipPrevious && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onSkipPrevious(habit.id);
                  }}
                >
                  <span className="menu-icon"><Ban size={14} /></span>
                  <span>Skip {catchUp.label}</span>
                </button>
              )}
              {skipped && onUndoSkip && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onUndoSkip(habit.id);
                  }}
                >
                  <span className="menu-icon"><Undo2 size={14} /></span>
                  <span>Undo skip</span>
                </button>
              )}
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