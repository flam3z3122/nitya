import { Check, Clock3, MoreHorizontal } from 'lucide-react';
import type { Task } from '@/types';

type TaskCardProps = {
  task: Task;
  onToggle: (id: string) => void;
};

export function TaskCard({ task, onToggle }: TaskCardProps) {
  return (
    <div className={`task-card ${task.completed ? 'is-complete' : ''}`}>
      <button className="task-check" onClick={() => onToggle(task.id)} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`}>
        {task.completed && <Check size={15} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="task-title">{task.title}</p>
        <div className="task-meta">
          <span className="category-pill">{task.category}</span>
          <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
          <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {task.time}</span>
        </div>
      </div>
      <button className="icon-button subtle" aria-label="More task options"><MoreHorizontal size={18} /></button>
    </div>
  );
}
