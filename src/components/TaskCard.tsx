import { Check, Clock3, Trash2 } from 'lucide-react';
import type { Task } from '@/types';

type TaskCardProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const handleDelete = () => { if (onDelete) onDelete(task.id); };
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
      {onDelete && <button className="icon-button subtle delete-btn" onClick={handleDelete} aria-label={`Delete ${task.title}`}><Trash2 size={16} /></button>}
    </div>
  );
}
