import { useEffect, useState } from 'react';
import { CheckSquare, Leaf, Plus, Target, X } from 'lucide-react';
import { SuggestionChips } from '@/components/SuggestionChips';
import { GoalFields } from '@/components/GoalFields';
import { goodHabitSuggestions } from '@/data/habitSuggestions';
import { taskSuggestions } from '@/data/taskSuggestions';
import { goalSuggestions } from '@/data/goalSuggestions';
import type { Task } from '@/types';

type AddType = 'task' | 'habit' | 'goal' | null;

type QuickAddProps = {
  open: boolean;
  intent?: AddType;
  onOpen?: () => void;
  onClose: () => void;
  onCreateTask: (title: string, category?: string, priority?: Task['priority']) => Promise<void>;
  onCreateHabit: (name: string, icon: string, color: string, frequency: string) => Promise<void>;
  onCreateGoal: (title: string, notes?: string, target?: number, progress?: number) => Promise<void>;
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

export function QuickAdd({ open, intent = null, onOpen, onClose, onCreateTask, onCreateHabit, onCreateGoal }: QuickAddProps) {
  const [type, setType] = useState<AddType>(null);
  const [value, setValue] = useState('');
  const [icon, setIcon] = useState('✦');
  const [color, setColor] = useState('mint');
  const [frequency, setFrequency] = useState('Daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreIdeas, setShowMoreIdeas] = useState(false);
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('Medium');
  const [goalNotes, setGoalNotes] = useState('');
  const [goalTarget, setGoalTarget] = useState(10);
  const [goalProgress, setGoalProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    setType(intent === 'task' || intent === 'habit' || intent === 'goal' ? intent : null);
    setValue('');
    setIcon('✦');
    setColor('mint');
    setFrequency('Daily');
    setError(null);
    setShowMoreIdeas(false);
    setTaskCategory('Personal');
    setTaskPriority('Medium');
    setGoalNotes('');
    setGoalTarget(10);
    setGoalProgress(0);
  }, [open, intent]);

  useEffect(() => {
    setShowMoreIdeas(false);
  }, [type]);

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
      if (type === 'task') await onCreateTask(next, taskCategory, taskPriority);
      if (type === 'habit') await onCreateHabit(next, icon, color, frequency);
      if (type === 'goal') await onCreateGoal(next, goalNotes, goalTarget, goalProgress);
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this item.');
    } finally {
      setSaving(false);
    }
  };

  const iconOptions = habitIcons.some((item) => item.value === icon)
    ? habitIcons
    : [{ value: icon, label: 'Yours' } as const, ...habitIcons];
  const ideaItems = type === 'task'
    ? taskSuggestions.map((item) => ({ id: item.title, label: item.title, icon: item.icon }))
    : type === 'goal'
      ? goalSuggestions.map((item) => ({ id: item.title, label: item.title, icon: item.icon }))
      : goodHabitSuggestions.map((item) => ({ id: item.name, label: item.name, icon: item.icon }));

  return <div className="quick-add-wrap"><div className={`quick-add-menu ${type === 'habit' ? 'is-habit' : type === 'goal' ? 'is-goal' : ''}`}>
    {type ? <>
      <div className="quick-add-header"><div><p className="eyebrow">NEW {type.toUpperCase()}</p><h3>{type === 'task' ? 'What needs to get done?' : type === 'habit' ? 'Add a habit' : 'Add a goal'}</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      {type === 'habit' ? (
        <div className="quick-habit-preview">
          <span className={`habit-icon habit-${color}`}>{icon}</span>
          <input autoFocus className="quick-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. Morning walk" onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
        </div>
      ) : type === 'goal' ? (
        <GoalFields
          title={value}
          notes={goalNotes}
          progress={goalProgress}
          target={goalTarget}
          autoFocus
          onTitleChange={setValue}
          onNotesChange={setGoalNotes}
          onProgressChange={setGoalProgress}
          onTargetChange={setGoalTarget}
        />
      ) : (
        <input autoFocus className="quick-input" value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. Call the dentist" onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
      )}

      {type === 'habit' && (
        <div className="quick-habit-details">
          <div className="quick-icon-head">
            <p className="quick-field-label">Icon</p>
            <span className="quick-icon-name">{iconOptions.find((item) => item.value === icon)?.label ?? 'Custom'}</span>
          </div>
          <div className="quick-icon-grid">
            {iconOptions.map((item) => (
              <button key={item.value} type="button" className={`quick-icon-pick ${icon === item.value ? 'is-active' : ''}`} onClick={() => setIcon(item.value)} aria-label={item.label} title={item.label}>
                {item.value}
              </button>
            ))}
          </div>
          <div className="quick-habit-meta">
            <div>
              <p className="quick-field-label">Color</p>
              <div className="quick-color-row">
                {habitColors.map((option) => (
                  <button key={option.value} type="button" className={`quick-color-dot habit-${option.value} ${color === option.value ? 'is-active' : ''}`} onClick={() => setColor(option.value)} aria-label={option.label} title={option.label} />
                ))}
              </div>
            </div>
            <div>
              <p className="quick-field-label">Repeat</p>
              <div className="quick-freq-row">
                {frequencies.map((valueFreq) => (
                  <button key={valueFreq} type="button" className={`edit-choice ${frequency === valueFreq ? 'is-active' : ''}`} onClick={() => setFrequency(valueFreq)}>{valueFreq}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <p className="quick-error">{error}</p>}
      <button className="button button-dark full-button" disabled={!value.trim() || saving} onClick={() => void submit()}>{saving ? 'Saving…' : type === 'habit' ? 'Save habit' : `Save ${type}`}</button>

      <SuggestionChips
        items={ideaItems}
        expanded={showMoreIdeas}
        onExpand={() => setShowMoreIdeas(true)}
        onSelect={(id) => {
          if (type === 'task') {
            const task = taskSuggestions.find((item) => item.title === id);
            if (!task) return;
            setValue(task.title);
            setTaskCategory(task.category);
            setTaskPriority(task.priority);
            return;
          }
          if (type === 'goal') {
            const goal = goalSuggestions.find((item) => item.title === id);
            if (!goal) return;
            setValue(goal.title);
            setGoalNotes(goal.notes);
            setGoalTarget(goal.target);
            setGoalProgress(0);
            return;
          }
          const habit = goodHabitSuggestions.find((item) => item.name === id);
          if (!habit) return;
          setValue(habit.name);
          setIcon(habit.icon);
          setColor(habit.color);
          setFrequency(habit.frequency);
        }}
      />
    </> : <>
      <div className="quick-add-header"><div><p className="eyebrow">QUICK ADD</p><h3>What would you like to add?</h3></div><button className="icon-button" onClick={close} aria-label="Close quick add"><X size={18} /></button></div>
      <div className="quick-add-options"><button onClick={() => setType('task')}><span className="quick-icon quick-green"><CheckSquare size={20} /></span><span><strong>Task</strong><small>A thing to get done</small></span></button><button onClick={() => setType('habit')}><span className="quick-icon quick-yellow"><Leaf size={20} /></span><span><strong>Habit</strong><small>A routine to build</small></span></button><button onClick={() => setType('goal')}><span className="quick-icon quick-blue"><Target size={20} /></span><span><strong>Goal</strong><small>A milestone to reach</small></span></button></div>
    </>}
  </div><button className="quick-add close" onClick={close} aria-label="Close quick add"><X size={24} /></button></div>;
}
