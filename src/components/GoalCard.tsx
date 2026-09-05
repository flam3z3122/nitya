import { Target, Trash2 } from 'lucide-react';
import type { Goal } from '@/types';

type GoalCardProps = {
  goal: Goal;
  onDelete?: (id: string) => void;
};

export function GoalCard({ goal, onDelete }: GoalCardProps) {
  const handleDelete = () => { if (onDelete) onDelete(goal.id); };
  return (
    <div className="goal-card">
      <span className="goal-icon"><Target size={18} /></span>
      <p className="goal-title">{goal.title}</p>
      {onDelete && <button className="icon-button subtle delete-btn" onClick={handleDelete} aria-label={`Delete ${goal.title}`}><Trash2 size={15} /></button>}
    </div>
  );
}
