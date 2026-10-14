import type { KeyboardEventHandler, ReactNode } from 'react';
import type { Task } from '@/types';

const categories = ['Personal', 'Work', 'Health', 'Study'];
const priorities: Task['priority'][] = ['High', 'Medium', 'Low'];

type TaskFieldsProps = {
  title: string;
  category: string;
  priority: Task['priority'];
  dueDate: string;
  autoFocus?: boolean;
  onTitleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: Task['priority']) => void;
  onDueDateChange: (value: string) => void;
  onTitleKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="edit-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function TaskFields({
  title,
  category,
  priority,
  dueDate,
  autoFocus = false,
  onTitleChange,
  onCategoryChange,
  onPriorityChange,
  onDueDateChange,
  onTitleKeyDown,
}: TaskFieldsProps) {
  return (
    <>
      <Field label="Title">
        <input
          className="quick-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={onTitleKeyDown}
          placeholder="e.g. Call the dentist"
          autoFocus={autoFocus}
        />
      </Field>
      <Field label="Category">
        <div className="edit-chip-row">
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className={`edit-choice ${category === value ? 'is-active' : ''}`}
              onClick={() => onCategoryChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Priority">
        <div className="edit-chip-row">
          {priorities.map((value) => (
            <button
              key={value}
              type="button"
              className={`edit-priority priority-${value.toLowerCase()} ${priority === value ? 'is-active' : ''}`}
              onClick={() => onPriorityChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Due date">
        <input
          className="quick-input"
          type="date"
          value={dueDate}
          onChange={(event) => onDueDateChange(event.target.value)}
        />
      </Field>
    </>
  );
}
