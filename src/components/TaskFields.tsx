import type { KeyboardEventHandler, ReactNode } from 'react';
import type { Task } from '@/types';
import { FieldRequirement } from '@/components/FieldRequirement';

const priorities: Task['priority'][] = ['High', 'Medium', 'Low'];

type TaskFieldsProps = {
  title: string;
  priority: Task['priority'];
  dueDate: string;
  autoFocus?: boolean;
  onTitleChange: (value: string) => void;
  onPriorityChange: (value: Task['priority']) => void;
  onDueDateChange: (value: string) => void;
  onTitleKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="edit-field">
      <FieldRequirement label={label} required={required} />
      {children}
    </div>
  );
}

export function TaskFields({
  title,
  priority,
  dueDate,
  autoFocus = false,
  onTitleChange,
  onPriorityChange,
  onDueDateChange,
  onTitleKeyDown,
}: TaskFieldsProps) {
  return (
    <>
      <Field label="Title" required>
        <input
          className="quick-input"
          required
          aria-required="true"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={onTitleKeyDown}
          placeholder="e.g. Call the dentist"
          autoFocus={autoFocus}
        />
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
