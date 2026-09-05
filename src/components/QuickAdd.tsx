import { useState } from 'react';
import { CheckSquare, Leaf, Plus, Sparkles, Target, X } from 'lucide-react';
import { goodHabitSuggestions, badHabitSuggestions } from '@/data/habitSuggestions';

type QuickAddProps = {
  open: boolean;
  onClose: () => void;
  onCreateTask: (title: string) => Promise<void>;
  onCreateHabit: (name: string) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
};

type AddType = 'task' | 'habit' | 'goal' | null;

export function QuickAdd({ open, onClose, onCreateTask, onCreateHabit, onCreateGoal }: QuickAddProps) {
  const [type, setType] = useState<AddType>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return <button className="quick-add" onClick={onClose} aria-label="Open quick add"><Plus size={25} /></button>;

  const close = () => {
    setType(null);
    setValue('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!value.trim() || !type) return;
    setSaving(true);
    setError(null);
    try {
      if (type === 'task') await onCreateTask(value.trim());
      if (type === 'habit') await onCreateHabit(value.trim());
      if (type === 'goal') await onCreateGoal(value.trim());
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  };

  const pickSuggestion = (name: string) => {
    setValue(name);
    void submit();
  };

  return <div className="quick-add-wrap"><div className="quick-add-menu">
    {type ? <>
      <div className="quick-add-header"><div><p className="eyebrow">NEW {type.toUpperCase()}</p><h3>{type === 'task' ? 'What needs to get done?' : type === 'habit' ? 'What routine are you building?' : 'What milestone matters?'}</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      <input autoFocus className="quick-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={type === 'task' ? 'e.g. Call the dentist' : type === 'habit' ? 'e.g. Go for a morning walk' : 'e.g. Launch my portfolio'} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
      {error && <p className="quick-error">{error}</p>}
      <button className="button button-dark full-button" disabled={!value.trim() || saving} onClick={() => void submit()}>{saving ? 'Saving…' : `Save ${type}`}</button>

      {type === 'habit' && (
        <div className="habit-suggestions">
          <div className="suggestion-group">
            <p className="suggestion-label"><Sparkles size={12} /> Good habits to build</p>
            <div className="suggestion-chips">
              {goodHabitSuggestions.map((h) => (
                <button key={h.name} className="suggestion-chip" onClick={() => pickSuggestion(h.name)}>
                  <span className="suggestion-chip-icon">{h.icon}</span>
                  {h.name}
                </button>
              ))}
            </div>
          </div>
          <div className="suggestion-group">
            <p className="suggestion-label">Bad habits to break</p>
            <div className="suggestion-chips">
              {badHabitSuggestions.map((h) => (
                <button key={h.name} className="suggestion-chip" onClick={() => pickSuggestion(h.name)}>
                  <span className="suggestion-chip-icon">{h.icon}</span>
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </> : <>
      <div className="quick-add-header"><div><p className="eyebrow">QUICK ADD</p><h3>What would you like to add?</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      <div className="quick-add-options"><button onClick={() => setType('task')}><span className="quick-icon quick-green"><CheckSquare size={20} /></span><span><strong>Task</strong><small>A thing to get done</small></span></button><button onClick={() => setType('habit')}><span className="quick-icon quick-yellow"><Leaf size={20} /></span><span><strong>Habit</strong><small>A routine to build</small></span></button><button onClick={() => setType('goal')}><span className="quick-icon quick-blue"><Target size={20} /></span><span><strong>Goal</strong><small>A milestone to reach</small></span></button></div>
    </>}
  </div><button className="quick-add close" onClick={close} aria-label="Close quick add"><X size={24} /></button></div>;
}
