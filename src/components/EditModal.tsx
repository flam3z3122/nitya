import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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

const habitColors = ['mint', 'peach', 'blue', 'lavender'] as const;
const frequencies = ['Daily', 'Weekly'] as const;
const priorities: Task['priority'][] = ['High', 'Medium', 'Low'];

function isTask(item: EditItem, type: EditType | null): item is Task {
  return type === 'task';
}

function isHabit(item: EditItem, type: EditType | null): item is Habit {
  return type === 'habit';
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

  if (!open || !type || !item) return null;

  const heading =
    type === 'task' ? 'Edit task' : type === 'habit' ? 'Edit habit' : 'Edit goal';

  const canSave =
    type === 'habit' ? name.trim().length > 0 : title.trim().length > 0;

  const submit = async () => {
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
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{heading}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close edit">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {type === 'habit' ? (
            <div className="form-grid">
              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                Icon
                <input value={icon} onChange={(event) => setIcon(event.target.value)} />
              </label>
              <label>
                Color
                <select value={color} onChange={(event) => setColor(event.target.value)}>
                  {habitColors.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Frequency
                <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                  {frequencies.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : type === 'task' ? (
            <div className="form-grid">
              <label>
                Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label>
                Category
                <input value={category} onChange={(event) => setCategory(event.target.value)} />
              </label>
              <label>
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Task['priority'])}
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Time
                <input value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            </div>
          ) : (
            <div className="form-grid">
              <label>
                Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
            </div>
          )}
          {error && <p className="quick-error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="button button-light" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="button button-dark"
            onClick={() => void submit()}
            disabled={!canSave || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
