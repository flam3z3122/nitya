import { useEffect, useState } from 'react';
import { CheckSquare, Leaf, Plus, Sparkles, Target, X } from 'lucide-react';
import { goodHabitSuggestions, badHabitSuggestions } from '@/data/habitSuggestions';

type AddType = 'task' | 'habit' | 'goal' | null;

type QuickAddProps = {
  open: boolean;
  intent?: AddType;
  onOpen?: () => void;
  onClose: () => void;
  onCreateTask: (title: string) => Promise<void>;
  onCreateHabit: (name: string, icon: string, color: string, frequency: string) => Promise<void>;
  onCreateGoal: (title: string) => Promise<void>;
};

const habitColors = [
  { value: 'mint', label: 'Mint' },
  { value: 'peach', label: 'Peach' },
  { value: 'blue', label: 'Blue' },
  { value: 'lavender', label: 'Lavender' },
] as const;

const habitIcons = ['✦', '💧', '🏃', '📚', '🧘', '🚶', '✍️', '🌅'];
const frequencies = ['Daily', 'Weekly'] as const;

export function QuickAdd({ open, intent = null, onOpen, onClose, onCreateTask, onCreateHabit, onCreateGoal }: QuickAddProps) {
  const [type, setType] = useState<AddType>(null);
  const [value, setValue] = useState('');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('mint');
  const [frequency, setFrequency] = useState('Daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(intent === 'task' || intent === 'habit' || intent === 'goal' ? intent : null);
    setValue('');
    setIcon('✦');
    setColor('mint');
    setFrequency('Daily');
    setError(null);
  }, [open, intent]);

  if (!open) return <button className="quick-add" onClick={() => onOpen?.()} aria-label="Open quick add"><Plus size={25} /></button>;

  const close = () => {
    setType(null);
    setValue('');
    setError(null);
    onClose();
  };

  const submit = async (raw?: string) => {
    const next = (raw ?? value).trim();
    if (!next || !type) return;
    setSaving(true);
    setError(null);
    try {
      if (type === 'task') await onCreateTask(next);
      if (type === 'habit') await onCreateHabit(next, icon, color, frequency);
      if (type === 'goal') await onCreateGoal(next);
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  };

  const habitIdeas = [...goodHabitSuggestions.slice(0, 6), ...badHabitSuggestions.slice(0, 3)];
  const shownIcons = habitIcons.includes(icon) ? habitIcons : [icon, ...habitIcons];

  return <div className="quick-add-wrap"><div className="quick-add-menu">
    {type ? <>
      <div className="quick-add-header"><div><p className="eyebrow">NEW {type.toUpperCase()}</p><h3>{type === 'task' ? 'What needs to get done?' : type === 'habit' ? 'What routine are you building?' : 'What milestone matters?'}</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      <input autoFocus className="quick-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={type === 'task' ? 'e.g. Call the dentist' : type === 'habit' ? 'e.g. Go for a morning walk' : 'e.g. Launch my portfolio'} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />

      {type === 'habit' && (
        <div className="quick-habit-details">
          <div className="edit-chip-row">
            {shownIcons.map((valueIcon) => (
              <button key={valueIcon} type="button" className={`edit-icon-chip ${icon === valueIcon ? 'is-active' : ''}`} onClick={() => setIcon(valueIcon)} aria-label={`Icon ${valueIcon}`}>{valueIcon}</button>
            ))}
          </div>
          <div className="edit-chip-row">
            {habitColors.map((option) => (
              <button key={option.value} type="button" className={`edit-color-chip habit-${option.value} ${color === option.value ? 'is-active' : ''}`} onClick={() => setColor(option.value)}><i />{option.label}</button>
            ))}
          </div>
          <div className="edit-chip-row">
            {frequencies.map((valueFreq) => (
              <button key={valueFreq} type="button" className={`edit-choice ${frequency === valueFreq ? 'is-active' : ''}`} onClick={() => setFrequency(valueFreq)}>{valueFreq}</button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="quick-error">{error}</p>}
      <button className="button button-dark full-button" disabled={!value.trim() || saving} onClick={() => void submit()}>{saving ? 'Saving…' : `Save ${type}`}</button>

      {type === 'habit' && (
        <div className="habit-suggestions">
          <p className="suggestion-label"><Sparkles size={12} /> Ideas</p>
          <div className="suggestion-chips">
            {habitIdeas.map((habit) => (
              <button key={habit.name} type="button" className="suggestion-chip" onClick={() => { setValue(habit.name); setIcon(habit.icon); setColor(habit.color); setFrequency(habit.frequency); }}>
                <span className="suggestion-chip-icon">{habit.icon}</span>
                {habit.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </> : <>
      <div className="quick-add-header"><div><p className="eyebrow">QUICK ADD</p><h3>What would you like to add?</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      <div className="quick-add-options"><button onClick={() => setType('task')}><span className="quick-icon quick-green"><CheckSquare size={20} /></span><span><strong>Task</strong><small>A thing to get done</small></span></button><button onClick={() => setType('habit')}><span className="quick-icon quick-yellow"><Leaf size={20} /></span><span><strong>Habit</strong><small>A routine to build</small></span></button><button onClick={() => setType('goal')}><span className="quick-icon quick-blue"><Target size={20} /></span><span><strong>Goal</strong><small>A milestone to reach</small></span></button></div>
    </>}
  </div><button className="quick-add close" onClick={close} aria-label="Close quick add"><X size={24} /></button></div>;
}
