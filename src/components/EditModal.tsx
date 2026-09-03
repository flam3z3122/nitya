import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Goal, Habit, Task } from '@/types';

type EditModalProps = {
  open: boolean;
  type: 'task' | 'habit' | 'goal' | null;
  item: Task | Habit | Goal | null;
  onClose: () => void;
  onSave: (id: string, updates: any) => Promise<void>;
};

export default function EditModal({ open, type, item, onClose, onSave }: EditModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [priority, setPriority] = useState<'Low'|'Medium'|'High'>('Medium');
  const [time, setTime] = useState('Anytime');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('mint');

  useEffect(() => {
    if (!open || !type || !item) return;
    if (type === 'task') {
      const t = item as Task;
      setTitle(t.title);
      setCategory(t.category);
      setPriority(t.priority);
      setTime((t as any).time ?? 'Anytime');
    } else if (type === 'habit') {
      const h = item as Habit;
      setName(h.name);
      setFrequency(h.frequency ?? 'Daily');
      setIcon(h.icon ?? '✦');
      setColor(h.color ?? 'mint');
    } else if (type === 'goal') {
      const g = item as Goal;
      setTitle(g.title);
    }
  }, [open, type, item]);

  if (!open || !type || !item) return null;

  const save = async () => {
    setLoading(true);
    try {
      if (type === 'task') {
        await onSave((item as Task).id, { title: title.trim(), category, priority, due_label: time });
      } else if (type === 'habit') {
        await onSave((item as Habit).id, { name: name.trim(), frequency, icon, color });
      } else if (type === 'goal') {
        await onSave((item as Goal).id, { title: title.trim() });
      }
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Edit {type}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          {type === 'task' && (
            <div className="form-grid">
              <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
              <label>Category<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
              <label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as any)}><option>Low</option><option>Medium</option><option>High</option></select></label>
              <label>Time<input value={time} onChange={(e) => setTime(e.target.value)} /></label>
            </div>
          )}
          {type === 'habit' && (
            <div className="form-grid">
              <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label>Frequency<select value={frequency} onChange={(e) => setFrequency(e.target.value)}><option>Daily</option><option>Weekly</option></select></label>
              <label>Icon<input value={icon} onChange={(e) => setIcon(e.target.value)} /></label>
              <label>Color<input value={color} onChange={(e) => setColor(e.target.value)} /></label>
            </div>
          )}
          {type === 'goal' && (
            <div className="form-grid">
              <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="button" onClick={onClose}>Cancel</button>
          <button className="button button-dark" disabled={loading} onClick={save}>{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
