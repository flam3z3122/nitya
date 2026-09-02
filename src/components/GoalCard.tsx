import { Target } from 'lucide-react';
import type { Goal } from '@/types';

type GoalCardProps = {
  goal: Goal;
};

export function GoalCard({ goal }: GoalCardProps) {
  return (
    <div className="goal-card">
      <span className="goal-icon"><Target size={18} /></span>
      <p className="goal-title">{goal.title}</p>
    </div>
  );
}
