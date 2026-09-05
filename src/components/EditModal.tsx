import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CheckSquare, Leaf, Target, X } from 'lucide-react';
import type { Goal, Habit, Task } from '@/types';

export type EditType = 'task' | 'habit' | 'goal';
export type EditItem = Task | Habit | Goal;
export type EditUpdates =
  | Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time'>>
  | Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency'>>
  | Partial<Pick<Goal, 'title'>>;

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
  { value: 'lavender', label: 'Lavender' },
] as const;

const habitIcons = ['✦', '💧', '🏃', '📚', '🧘', '🚶', '✍️', '🌅'];
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
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('mint');
  const [frequency, setFrequency] = useState('Daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item || !type) return;
    setError(null);
    if (isTask(item, type)) {
      setTitle(item.title);
      setCategory(item.category);
      setPriority(item.priority);
      setTime(item.time);
    } else if (isHabit(item, type)) {
      setName(item.name);
      setIcon(item.icon);
      setColor(item.color);
      setFrequency(item.frequency);
    } else {
      setTitle(item.title);
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
  const shownIcons = habitIcons.includes(icon) ? habitIcons : [icon, ...habitIcons];

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
          time: time.trim() || 'Anytime',
        });
      } else if (type === 'habit') {
        await onSave(item.id, {
          name: name.trim(),
          icon: icon.trim() || '✦',
          color,
          frequency,
        });
      } else {
        await onSave(item.id, { title: title.trim() });
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
        className="edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
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

        <form className="edit-modal-body" onSubmit={(event) => void submit(event)}>
          {type === 'habit' ? (
            <>
              <div className="edit-habit-preview">
                <span className={`habit-icon habit-${color}`}>{icon}</span>
                <Field label="Name">
                  <input
                    className="quick-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Morning walk"
                    autoFocus
                  />
                </Field>
              </div>
              <Field label="Icon">
                <div className="edit-chip-row">
                  {shownIcons.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`edit-icon-chip ${icon === value ? 'is-active' : ''}`}
                      onClick={() => setIcon(value)}
                      aria-label={`Icon ${value}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Color">
                <div className="edit-chip-row">
                  {habitColors.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`edit-color-chip habit-${option.value} ${color === option.value ? 'is-active' : ''}`}
                      onClick={() => setColor(option.value)}
                    >
                      <i />
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Frequency">
                <div className="edit-chip-row">
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
              </Field>
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
              <div className="edit-field-row">
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
                <Field label="Time">
                  <input
                    className="quick-input"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    placeholder="Anytime"
                  />
                </Field>
              </div>
            </>
          ) : (
            <Field label="Title">
              <input
                className="quick-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Launch my portfolio"
                autoFocus
              />
            </Field>
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
