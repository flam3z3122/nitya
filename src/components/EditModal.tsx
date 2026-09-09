import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CheckSquare, Leaf, Target, X } from 'lucide-react';
import type { Goal, Habit, Task } from '@/types';
import { GoalFields } from '@/components/GoalFields';

export type EditType = 'task' | 'habit' | 'goal';
export type EditItem = Task | Habit | Goal;
export type EditUpdates =
  | Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time'>>
  | Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>>
  | Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>>;

type EditModalProps = {
  open: boolean;
  type: EditType | null;
  item: EditItem | null;
  onClose: () => void;
  onSave: (id: string, updates: EditUpdates) => Promise<void>;
};

const habitColors = [
  { value: 'mint', label: 'Mint' },
  { value: 'peach', label: 'Peach' },
  { value: 'blue', label: 'Blue' },
  { value: 'lavender', label: 'Lilac' },
] as const;

const habitIcons = [
  { value: '✦', label: 'Focus' },
  { value: '💧', label: 'Water' },
  { value: '🏃', label: 'Move' },
  { value: '📚', label: 'Read' },
  { value: '🧘', label: 'Calm' },
  { value: '🚶', label: 'Walk' },
  { value: '✍️', label: 'Write' },
  { value: '🌅', label: 'Start' },
] as const;
const frequencies = ['Daily', 'Weekly'] as const;
const priorities: Task['priority'][] = ['High', 'Medium', 'Low'];
const categories = ['Personal', 'Work', 'Health', 'Study'];

function isTask(item: EditItem, type: EditType | null): item is Task {
  return type === 'task';
}

function isHabit(item: EditItem, type: EditType | null): item is Habit {
  return type === 'habit';
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="edit-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function EditModal({ open, type, item, onClose, onSave }: EditModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('mint');
  const [frequency, setFrequency] = useState('Daily');
  const [notes, setNotes] = useState('');
  const [target, setTarget] = useState(10);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !type) return;
    setError(null);
    if (isTask(item, type)) {
      setTitle(item.title);
      setCategory(item.category);
      setPriority(item.priority);
    } else if (isHabit(item, type)) {
      setName(item.name);
      setIcon(item.icon);
      setColor(item.color);
      setFrequency(item.frequency);
    } else {
      setTitle(item.title);
      setNotes(item.notes ?? '');
      setTarget(item.target ?? 10);
      setProgress(item.progress ?? 0);
    }
  }, [item, type]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !type || !item) return null;

  const copy = {
    task: { eyebrow: 'Edit task', title: 'What needs to get done?', icon: CheckSquare, mark: 'quick-green' },
    habit: { eyebrow: 'Edit habit', title: 'What routine are you building?', icon: Leaf, mark: 'quick-yellow' },
    goal: { eyebrow: 'Edit goal', title: 'What milestone matters?', icon: Target, mark: 'quick-blue' },
  }[type];
  const MarkIcon = copy.icon;

  const canSave = type === 'habit' ? name.trim().length > 0 : title.trim().length > 0;
  const shownIcons = habitIcons.some((itemIcon) => itemIcon.value === icon)
    ? habitIcons
    : [{ value: icon, label: 'Yours' } as const, ...habitIcons];

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (type === 'task') {
        await onSave(item.id, {
          title: title.trim(),
          category: category.trim() || 'Personal',
          priority,
        });
      } else if (type === 'habit') {
        await onSave(item.id, {
          name: name.trim(),
          icon: icon.trim() || '✦',
          color,
          frequency,
        });
      } else {
        await onSave(item.id, {
          title: title.trim(),
          notes: notes.trim(),
          target: Math.max(1, target),
          progress: Math.min(Math.max(0, progress), Math.max(1, target)),
        });
      }
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`edit-modal${type === 'habit' ? ' is-habit' : type === 'goal' ? ' is-goal' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {type === 'habit' || type === 'goal' ? (
          <div className="quick-add-header">
            <div>
              <p className="eyebrow">{type === 'habit' ? 'EDIT HABIT' : 'EDIT GOAL'}</p>
              <h3 id="edit-modal-title">{type === 'habit' ? 'Edit a habit' : 'Edit a goal'}</h3>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close edit">
              <X size={18} />
            </button>
          </div>
        ) : (
        <div className="edit-modal-header">
          <div className="edit-modal-heading">
            <span className={`quick-icon ${copy.mark}`}>
              <MarkIcon size={18} />
            </span>
            <div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h3 id="edit-modal-title">{copy.title}</h3>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close edit">
            <X size={18} />
          </button>
        </div>
        )}

        <form className="edit-modal-body" onSubmit={(event) => void submit(event)}>
          {type === 'habit' ? (
            <>
              <div className="quick-habit-preview">
                <span className={`habit-icon habit-${color}`}>{icon}</span>
                <input
                  className="quick-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Morning walk"
                  autoFocus
                />
              </div>
              <div className="quick-habit-details">
                <div className="quick-icon-head">
                  <p className="quick-field-label">Icon</p>
                  <span className="quick-icon-name">{shownIcons.find((itemIcon) => itemIcon.value === icon)?.label ?? 'Custom'}</span>
                </div>
                <div className="quick-icon-grid">
                  {shownIcons.map((itemIcon) => (
                    <button
                      key={itemIcon.value}
                      type="button"
                      className={`quick-icon-pick ${icon === itemIcon.value ? 'is-active' : ''}`}
                      onClick={() => setIcon(itemIcon.value)}
                      aria-label={itemIcon.label}
                      title={itemIcon.label}
                    >
                      {itemIcon.value}
                    </button>
                  ))}
                </div>
                <div className="quick-habit-meta">
                  <div>
                    <p className="quick-field-label">Color</p>
                    <div className="quick-color-row">
                      {habitColors.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`quick-color-dot habit-${option.value} ${color === option.value ? 'is-active' : ''}`}
                          onClick={() => setColor(option.value)}
                          aria-label={option.label}
                          title={option.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="quick-field-label">Repeat</p>
                    <div className="quick-freq-row">
                      {frequencies.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`edit-choice ${frequency === value ? 'is-active' : ''}`}
                          onClick={() => setFrequency(value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : type === 'task' ? (
            <>
              <Field label="Title">
                <input
                  className="quick-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Call the dentist"
                  autoFocus
                />
              </Field>
              <Field label="Category">
                <div className="edit-chip-row">
                  {categories.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`edit-choice ${category === value ? 'is-active' : ''}`}
                      onClick={() => setCategory(value)}
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
                      onClick={() => setPriority(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          ) : (
            <>
              <GoalFields
                title={title}
                notes={notes}
                progress={progress}
                target={target}
                autoFocus
                onTitleChange={setTitle}
                onNotesChange={setNotes}
                onProgressChange={setProgress}
                onTargetChange={setTarget}
              />
            </>
          )}

          {error && <p className="quick-error">{error}</p>}

          <div className="edit-modal-actions">
            <button type="button" className="button button-light" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="button button-dark" disabled={!canSave || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
