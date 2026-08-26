import { Check, Flame, MoreHorizontal } from 'lucide-react';
import type { Habit } from '@/types';

type HabitCardProps = {
  habit: Habit;
  onToggle: (id: string) => void;
  compact?: boolean;
};

export function HabitCard({ habit, onToggle, compact = false }: HabitCardProps) {
  return (
    <div className={`habit-card ${compact ? 'habit-card-compact' : ''}`}>
      <div className={`habit-icon habit-${habit.color}`}>{habit.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="habit-name">{habit.name}</p>
        <div className="habit-meta"><span>{habit.frequency}</span><span className="streak"><Flame size={13} fill="currentColor" /> {habit.streak} day streak</span></div>
      </div>
      <button className={`habit-check ${habit.completed ? 'is-complete' : ''}`} onClick={() => onToggle(habit.id)} aria-label={`Mark ${habit.name} ${habit.completed ? 'incomplete' : 'complete'}`}>
        {habit.completed && <Check size={17} strokeWidth={3} />}
      </button>
      {!compact && <button className="icon-button subtle" aria-label="More habit options"><MoreHorizontal size={18} /></button>}
    </div>
  );
}
