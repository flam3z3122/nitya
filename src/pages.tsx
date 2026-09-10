import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, Check, ChevronLeft, ChevronRight, Clock3, FileText, Flame, ListChecks, Loader2, LogOut, Mail, Moon, Pencil, ShieldAlert, ShieldCheck, Sparkles, Sun, TrendingUp, Trash2, X } from 'lucide-react';
import { HabitCard } from '@/components/HabitCard';
import { EmptyState } from '@/components/EmptyState';
import { completedHabitsOn, currentWeekDays, dateKey, dayCompletionRate, daysInMonth, formatReminderTime, isWeeklyHabit, localDateKey, mondayOffset, shiftMonth, todayKey } from '@/lib/activity';
import { requestReminderPermission } from '@/hooks/useReminders';
import { ProgressCard } from '@/components/ProgressCard';
import { TaskCard } from '@/components/TaskCard';
import { GoalCard } from '@/components/GoalCard';
import { StatsCard } from '@/components/StatsCard';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import type { Goal, Habit, ProfileSettings, Screen, Task } from '@/types';

type TodayProps = { tasks: Task[]; habits: Habit[]; goals: Goal[]; onToggleTask: (id: string, completed: boolean) => Promise<void>; onToggleHabit: (id: string, completed: boolean) => Promise<void>; onDeleteTask: (id: string) => Promise<void>; onDeleteHabit: (id: string) => Promise<void>; onDeleteGoal: (id: string) => Promise<void>; onNavigate: (screen: Screen) => void; onQuickAdd: (type?: 'task' | 'habit' | 'goal') => void; onEditTask: (id: string) => void; onEditHabit: (id: string) => void; onEditGoal: (id: string) => void; onCheckInGoal: (id: string) => void; onMarkPrevious: (id: string) => void; onSkipPrevious: (id: string) => void; onUndoSkip: (id: string) => void; userName?: string };

const pageMeta: Record<Screen, { eyebrow: string; title: string }> = { today: { eyebrow: '', title: '' }, tasks: { eyebrow: 'YOUR LIST', title: 'Tasks' }, habits: { eyebrow: 'YOUR ROUTINES', title: 'Habits' }, progress: { eyebrow: 'YOUR MOMENTUM', title: 'Progress' }, profile: { eyebrow: 'YOUR SPACE', title: 'Profile' } };

function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening'; }

function formatDate() { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(); }

export function PageHeader({ screen, action, userName }: { screen: Screen; action?: React.ReactNode; userName?: string }) { const meta = pageMeta[screen]; const eyebrow = screen === 'today' ? formatDate() : meta.eyebrow; const title = screen === 'today' ? `${getGreeting()}, ${userName ?? 'there'}` : meta.title; return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="header-actions">{action}</div></header>; }

export function TodayPage({ tasks, habits, goals, onToggleTask, onToggleHabit, onDeleteTask, onDeleteHabit, onDeleteGoal, onNavigate, onQuickAdd, onEditTask, onEditHabit, onEditGoal, onCheckInGoal, onMarkPrevious, onSkipPrevious, onUndoSkip, userName }: TodayProps) {
  const completed = tasks.filter((task) => task.completed).length + habits.filter((habit) => habit.completed).length;
  const reminders = habits.filter((habit) => habit.reminder_time).slice().sort((a, b) => (a.reminder_time ?? '').localeCompare(b.reminder_time ?? ''));
  const visibleTasks = tasks.slice(0, 3);
  const remainingTasks = Math.max(0, tasks.length - visibleTasks.length);
  const topHabit = habits.reduce<Habit | null>((best, habit) => (!best || habit.streak > best.streak ? habit : best), null);
  const bestStreak = topHabit?.streak ?? 0;
  const streakUnit = topHabit && isWeeklyHabit(topHabit.frequency)
    ? (bestStreak === 1 ? 'week' : 'weeks')
    : (bestStreak === 1 ? 'day' : 'days');
  const today = todayKey();
  return (
    <div className="page-content">
      <PageHeader screen="today" userName={userName} />
      <div className="today-layout">
        <div className="today-main">
          <ProgressCard completed={completed} total={tasks.length + habits.length} />
          {reminders.length > 0 && (
            <section className="content-section reminder-section">
              <div className="section-heading">
                <div><p className="eyebrow">TODAY&apos;S NUDGES</p><h2>Reminders</h2></div>
              </div>
              <div className="reminder-list">
                {reminders.map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    className={`reminder-item ${habit.completed ? 'is-done' : ''}`}
                    onClick={() => onEditHabit(habit.id)}
                  >
                    <span className={`habit-icon habit-${habit.color}`}>{habit.icon}</span>
                    <div>
                      <strong>{habit.name}</strong>
                      <span>{formatReminderTime(habit.reminder_time ?? '')}{habit.completed ? ' · Done' : ''}</span>
                    </div>
                    <Clock3 size={15} />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="content-section">
            <div className="section-heading">
              <div><p className="eyebrow">BUILDING CONSISTENCY</p><h2>Today&apos;s habits</h2></div>
              <button className="text-button" onClick={() => onNavigate('habits')}>Manage <ArrowRight size={15} /></button>
            </div>
            <div className="habit-list">
              {habits.length === 0 ? (
                <EmptyState title="No habits yet" message="Start a small routine you can repeat." actionLabel="Add a habit" onAction={() => onQuickAdd('habit')} />
              ) : (
                habits.slice(0, 3).map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onToggle={(id) => void onToggleHabit(id, !habit.completed)}
                    onEdit={onEditHabit}
                    onMarkPrevious={(id) => void onMarkPrevious(id)}
                    onSkipPrevious={onSkipPrevious}
                    onUndoSkip={onUndoSkip}
                    compact
                  />
                ))
              )}
            </div>
          </section>
          <section className="content-section">
            <div className="section-heading">
              <div><p className="eyebrow">FOCUS FOR TODAY</p><h2>Today&apos;s tasks</h2></div>
              <button className="text-button" onClick={() => onNavigate('tasks')}>View all <ArrowRight size={15} /></button>
            </div>
            <div className="task-list">
              {tasks.length === 0 ? (
                <EmptyState title="No tasks yet" message="Add something you want to get done today." actionLabel="Add a task" onAction={() => onQuickAdd('task')} />
              ) : (
                <>
                  {visibleTasks.map((task) => <TaskCard key={task.id} task={task} onToggle={(id) => void onToggleTask(id, !task.completed)} onDelete={(id) => void onDeleteTask(id)} onEdit={onEditTask} />)}
                  {remainingTasks > 0 && <button className="show-more-btn" onClick={() => onNavigate('tasks')}>+{remainingTasks} more</button>}
                </>
              )}
            </div>
          </section>
          {goals.length > 0 && (
            <section className="content-section">
              <div className="section-heading">
                <div><p className="eyebrow">YOUR MILESTONES</p><h2>Goals</h2></div>
              </div>
              <div className="goal-list">
                {goals.slice(0, 3).map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={(id) => void onDeleteGoal(id)} onEdit={onEditGoal} onCheckIn={onCheckInGoal} />)}
              </div>
            </section>
          )}
          <section className="keep-going-card">
            <div className="keep-going-head">
              <div className="mini-stat-icon"><Flame size={18} /></div>
              <div>
                <p className="eyebrow">KEEP IT GOING</p>
                <h2>{bestStreak} {streakUnit}</h2>
                <span>{topHabit && bestStreak > 0 ? topHabit.name : 'Check in today to start a streak'}</span>
              </div>
              <button className="text-button" onClick={() => onNavigate('progress')}>Progress <ArrowRight size={15} /></button>
            </div>
            <div className="keep-week">
              {currentWeekDays().map((day) => {
                const done = completedHabitsOn(habits, day.key).length > 0;
                return (
                  <div key={day.key} className={`keep-week-day${done ? ' is-done' : ''}${day.key === today ? ' is-today' : ''}`}>
                    <span>{day.label}</span>
                    <i>{done ? <Check size={12} strokeWidth={3} /> : null}</i>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <aside className="today-aside">
          <div className="quote-card">
            <Sparkles size={19} />
            <p>&ldquo;Success is the sum of small efforts, repeated day in and day out.&rdquo;</p>
            <span>&mdash; Robert Collier</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

type HabitsProps = { habits: Habit[]; onToggle: (id: string, completed: boolean) => Promise<void>; onDelete: (id: string) => Promise<void>; onQuickAdd: (type?: 'task' | 'habit' | 'goal') => void; onEdit: (id: string) => void; onMarkPrevious: (id: string) => Promise<void> | void; onSkipPrevious: (id: string) => void; onUndoSkip: (id: string) => void };

type TasksProps = { tasks: Task[]; onToggle: (id: string, completed: boolean) => Promise<void>; onDelete: (id: string) => Promise<void>; onQuickAdd: (type?: 'task' | 'habit' | 'goal') => void; onEdit: (id: string) => void };

export function TasksPage({ tasks, onToggle, onDelete, onQuickAdd, onEdit }: TasksProps) {
  const [filter, setFilter] = useState<'All' | 'Open' | 'Done'>('All');
  const openCount = tasks.filter((task) => !task.completed).length;
  const doneCount = tasks.filter((task) => task.completed).length;
  const visible = tasks
    .filter((task) => filter === 'All' || (filter === 'Open' ? !task.completed : task.completed))
    .slice()
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  return (
    <div className="page-content">
      <PageHeader screen="tasks" action={<button className="button button-dark" onClick={() => onQuickAdd('task')}><span>+</span> New task</button>} />
      <div className="subpage-intro">
        <div className="mini-stat">
          <div className="mini-stat-icon"><ListChecks size={18} /></div>
          <div><strong>{openCount} open</strong><span>still to do</span></div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-icon blue"><Check size={18} /></div>
          <div><strong>{doneCount} done</strong><span>completed</span></div>
        </div>
      </div>
      <div className="filter-row">
        {(['All', 'Open', 'Done'] as const).map((value) => (
          <button key={value} className={filter === value ? 'filter active' : 'filter'} onClick={() => setFilter(value)}>{value}</button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title={filter === 'Done' ? 'Nothing completed yet' : filter === 'Open' ? 'You are all caught up' : 'No tasks yet'}
          message={filter === 'All' ? 'Add a task from here or from Today.' : 'Switch filters to see the rest of your list.'}
          actionLabel={filter === 'All' ? 'Add a task' : undefined}
          onAction={filter === 'All' ? () => onQuickAdd('task') : undefined}
        />
      ) : (
        <section className="task-list">
          {visible.map((task) => (
            <TaskCard key={task.id} task={task} onToggle={(id) => void onToggle(id, !task.completed)} onDelete={(id) => void onDelete(id)} onEdit={onEdit} />
          ))}
        </section>
      )}
    </div>
  );
}

export function HabitsPage({ habits, onToggle, onDelete, onQuickAdd, onEdit, onMarkPrevious, onSkipPrevious, onUndoSkip }: HabitsProps) {
  const [filter, setFilter] = useState('All habits');
  const top = habits.reduce<Habit | null>((best, habit) => (!best || habit.streak > best.streak ? habit : best), null);
  const streakLabel = top && top.streak > 0
    ? `${top.streak} ${isWeeklyHabit(top.frequency) ? 'wk' : 'days'}`
    : '0 days';
  const visible = habits.filter((habit) => filter === 'All habits' || (filter === 'Daily' ? !isWeeklyHabit(habit.frequency) : isWeeklyHabit(habit.frequency)));
  return (
    <div className="page-content">
      <PageHeader screen="habits" action={<button className="button button-dark" onClick={() => onQuickAdd('habit')}><span>+</span> New habit</button>} />
      <div className="subpage-intro">
        <div className="mini-stat">
          <div className="mini-stat-icon"><Flame size={18} /></div>
          <div><strong>{streakLabel}</strong><span>longest current streak</span></div>
        </div>
        <div className="mini-stat">
          <div className="mini-stat-icon blue"><TrendingUp size={18} /></div>
          <div><strong>{habits.length ? Math.round((habits.filter((habit) => habit.completed).length / habits.length) * 100) : 0}%</strong><span>due this period</span></div>
        </div>
      </div>
      <div className="filter-row">
        <button className={filter === 'All habits' ? 'filter active' : 'filter'} onClick={() => setFilter('All habits')}>All habits</button>
        <button className={filter === 'Daily' ? 'filter active' : 'filter'} onClick={() => setFilter('Daily')}>Daily</button>
        <button className={filter === 'Weekly' ? 'filter active' : 'filter'} onClick={() => setFilter('Weekly')}>Weekly</button>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title={habits.length === 0 ? 'No habits yet' : `No ${filter.toLowerCase()} yet`}
          message={habits.length === 0 ? 'Add a routine you want to keep.' : 'Try another filter, or create a habit.'}
          actionLabel="Add a habit"
          onAction={() => onQuickAdd('habit')}
        />
      ) : (
        <section className="habit-grid">
          {visible.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={(id) => void onToggle(id, !habit.completed)}
              onDelete={(id) => void onDelete(id)}
              onEdit={onEdit}
              onMarkPrevious={(id) => void onMarkPrevious(id)}
              onSkipPrevious={onSkipPrevious}
              onUndoSkip={onUndoSkip}
            />
          ))}
        </section>
      )}
    </div>
  );
}

export function ProgressPage({ tasks, habits }: { tasks: Task[]; habits: Habit[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(now.getDate());
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const selectedDate = new Date(cursor.year, cursor.month, selected);
  const selectedKey = dateKey(cursor.year, cursor.month, selected);
  const doneOnDay = completedHabitsOn(habits, selectedKey);
  const rate = dayCompletionRate(habits, selectedKey);
  const completed = tasks.filter((task) => task.completed).length + habits.filter((habit) => habit.completed).length;
  const total = tasks.length + habits.length;
  const score = total ? Math.round((completed / total) * 100) : 0;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = localDateKey(date);
    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      rate: dayCompletionRate(habits, key),
      isToday: key === todayKey(),
    };
  });
  const cells = useMemo(() => {
    const blanks = mondayOffset(cursor.year, cursor.month);
    const days = daysInMonth(cursor.year, cursor.month);
    return [
      ...Array.from({ length: blanks }, (_, index) => ({ key: `pad-${index}`, day: 0 })),
      ...Array.from({ length: days }, (_, index) => ({ key: dateKey(cursor.year, cursor.month, index + 1), day: index + 1 })),
    ];
  }, [cursor.year, cursor.month]);

  const moveMonth = (delta: number) => {
    const next = shiftMonth(cursor.year, cursor.month, delta);
    setCursor(next);
    const current = next.year === now.getFullYear() && next.month === now.getMonth();
    setSelected(current ? now.getDate() : 1);
  };

  return (
    <div className="page-content">
      <PageHeader screen="progress" />
      <div className="score-banner">
        <div>
          <p className="eyebrow light">TODAY</p>
          <h2>{(score / 10).toFixed(1)} <span>/ 10</span></h2>
          <p>From tasks and habits checked off today.</p>
        </div>
        <div className="score-ring"><strong>{score}</strong><span>score</span></div>
      </div>
      <section className="stats-grid progress-stats">
        <StatsCard label="Current streak" value={`${Math.max(0, ...habits.map((habit) => habit.streak))}`} helper="Best habit streak" icon={<Flame size={19} />} tone="orange" />
        <StatsCard label="Due this period" value={`${habits.length ? Math.round((habits.filter((habit) => habit.completed).length / habits.length) * 100) : 0}%`} helper="Habits completed" icon={<TrendingUp size={19} />} tone="green" />
      </section>
      <section className="chart-card">
        <div className="section-heading">
          <div><p className="eyebrow">LAST 7 DAYS</p><h2>Activity</h2></div>
        </div>
        <div className="bar-chart">
          {week.map((day) => (
            <div className="bar-column" key={day.key}>
              <div className={`bar ${day.isToday ? 'highlight' : ''}`} style={{ height: `${day.rate}%` }} />
              <span>{day.label}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="progress-history">
        <section className="calendar-card">
          <div className="calendar-top">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <div>
              <strong>{monthLabel}</strong>
              <span>{isCurrentMonth ? 'This month' : 'Past month'}</span>
            </div>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
          </div>
          <div className="weekday-row">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((cell) => cell.day === 0
              ? <span key={cell.key} className="calendar-day is-spacer" />
              : (
                <button
                  key={cell.key}
                  className={`calendar-day ${selected === cell.day ? 'selected' : ''} ${completedHabitsOn(habits, cell.key).length > 0 ? 'has-activity' : ''}`}
                  onClick={() => setSelected(cell.day)}
                >
                  {cell.day}
                  <i />
                </button>
              ))}
          </div>
        </section>
        <section className="day-detail">
          <div className="detail-date">
            <div>
              <p className="eyebrow">{selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</p>
              <h2>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h2>
            </div>
            <div className="date-number">{selected}</div>
          </div>
          <div className="detail-progress">
            <div><span>Completion</span><strong>{rate}%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${rate}%` }} /></div>
          </div>
          <div className="detail-items">
            <p className="eyebrow">HABITS</p>
            {doneOnDay.length === 0 ? (
              <div className="detail-item">
                <span className="detail-item-icon yellow"><Flame size={17} /></span>
                <div><strong>Nothing logged</strong><small>Check in on a habit to see it here</small></div>
              </div>
            ) : doneOnDay.map((habit) => (
              <div className="detail-item" key={habit.id}>
                <span className={`detail-item-icon green habit-icon habit-${habit.color}`}>{habit.icon}</span>
                <div><strong>{habit.name}</strong><small>{habit.frequency}</small></div>
                <span className="detail-check">&check;</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

type ProfilePageProps = {
  profile: ProfileSettings | null;
  authEmail: string;
  onSignOut: () => void;
  onUpdateProfile: (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled'>>) => Promise<void>;
  onSendVerification: () => Promise<{ error: string | null }>;
  onConfirmEmail: (payload: { token?: string; token_hash?: string; type?: string }) => Promise<{ error: string | null }>;
  onDeleteAccount: () => Promise<void>;
};

type Toast = { id: number; message: string; tone: 'success' | 'error' };

export function ProfilePage({ profile, authEmail, onSignOut, onUpdateProfile, onSendVerification, onConfirmEmail, onDeleteAccount }: ProfilePageProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const name = profile?.name ?? 'Your name';
  const email = profile?.email ?? authEmail ?? '';
  const themes: Array<'Light' | 'Dark'> = ['Light', 'Dark'];
  const activeTheme: 'Light' | 'Dark' = profile?.theme === 'Dark' ? 'Dark' : 'Light';

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  const saveName = async () => { if (!nameValue.trim()) return; setNameSaving(true); await onUpdateProfile({ name: nameValue.trim() }); setNameSaving(false); setEditingName(false); };
  const setTheme = async (theme: 'Light' | 'Dark') => { setThemeOpen(false); setSavingKey('theme'); await onUpdateProfile({ theme }); setSavingKey(null); };
  const toggleNotifications = async () => {
    const next = !profile?.notifications_enabled;
    if (next) {
      const allowed = await requestReminderPermission();
      if (!allowed) {
        showToast('Allow notifications in your browser to get reminders.', 'error');
        return;
      }
    }
    setSavingKey('notifications');
    await onUpdateProfile({ notifications_enabled: next });
    setSavingKey(null);
  };

  const handleSendVerification = async () => {
    setSendingVerify(true);
    const result = await onSendVerification();
    setSendingVerify(false);
    if (result.error) showToast(result.error, 'error');
    else {
      setCodeSent(true);
      showToast('Check your inbox for a verification email.', 'success');
    }
  };

  const handleConfirmCode = async () => {
    const token = verifyCode.trim();
    if (!token) return;
    setConfirming(true);
    const result = await onConfirmEmail({ token });
    setConfirming(false);
    if (result.error) showToast(result.error, 'error');
    else {
      setVerifyCode('');
      setCodeSent(false);
      showToast('Your email is verified.', 'success');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await onDeleteAccount();
    } catch (error) {
      setDeleting(false);
      showToast(error instanceof Error ? error.message : 'Could not delete your account.', 'error');
    }
  };

  if (privacyOpen) {
    return <PrivacyPolicy onBack={() => setPrivacyOpen(false)} />;
  }

  return <div className="page-content"><PageHeader screen="profile" />
    <section className="profile-card">
      <div className="avatar avatar-large">{(editingName ? nameValue || 'A' : name).split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
      <div className="profile-card-copy">
        {editingName ? (
          <input
            className="profile-name-input"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Your name"
            autoFocus
            aria-label="Your name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveName();
              if (e.key === 'Escape') { setEditingName(false); setNameValue(profile?.name ?? ''); }
            }}
          />
        ) : (
          <h2>{name}</h2>
        )}
        <p>{email}</p>
        <span className="member-pill"><Sparkles size={12} /> Personal workspace</span>
      </div>
      {editingName ? (
        <div className="profile-edit-actions">
          <button type="button" className="icon-button" disabled={nameSaving || !nameValue.trim()} onClick={() => void saveName()} aria-label="Save name">
            {nameSaving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
          </button>
          <button type="button" className="icon-button" onClick={() => { setEditingName(false); setNameValue(profile?.name ?? ''); }} aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button className="icon-button profile-edit-btn" onClick={() => { setNameValue(profile?.name ?? ''); setEditingName(true); }} aria-label="Edit name"><Pencil size={16} /></button>
      )}
    </section>

    <section className="settings-section"><p className="eyebrow">EMAIL</p><div className="settings-card">
      <div className="setting-row email-row">
        <span className="setting-icon"><Mail size={18} /></span>
        <div className="email-row-content">
          <span className="setting-title">{email}</span>
          <span className={`verify-badge ${profile?.email_verified ? 'verified' : 'unverified'}`}>
            {profile?.email_verified ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            {profile?.email_verified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </div>
      {!profile?.email_verified && (
        <div className="resend-section">
          <p className="verify-copy">Optional. Confirm this address whenever you like — you can keep using daymark either way.</p>
          <button className="resend-btn" disabled={sendingVerify} onClick={() => void handleSendVerification()}>
            {sendingVerify ? <Loader2 size={15} className="spin" /> : <Mail size={15} />}
            {sendingVerify ? 'Sending\u2026' : codeSent ? 'Resend email' : 'Send verification email'}
          </button>
          {codeSent && (
            <div className="verify-code-row">
              <input
                className="verify-code-input"
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value)}
                placeholder="Code from email"
                inputMode="numeric"
                autoComplete="one-time-code"
                onKeyDown={(event) => { if (event.key === 'Enter') void handleConfirmCode(); }}
              />
              <button type="button" className="button button-dark" disabled={confirming || !verifyCode.trim()} onClick={() => void handleConfirmCode()}>
                {confirming ? 'Checking\u2026' : 'Confirm'}
              </button>
            </div>
          )}
        </div>
      )}
    </div></section>

    <section className="settings-section"><p className="eyebrow">PREFERENCES</p><div className="settings-card">
      <button className="setting-row" onClick={() => setThemeOpen((v) => !v)}><span className="setting-icon"><Moon size={18} /></span><span className="setting-title">Appearance</span><span className="setting-value">{savingKey === 'theme' ? 'Saving\u2026' : activeTheme}</span>{themeOpen ? <ChevronRight size={16} className="setting-arrow up" /> : <ChevronRight size={16} className="setting-arrow" />}</button>
      {themeOpen && <div className="setting-options">{themes.map((t) => <button key={t} className={`setting-option ${activeTheme === t ? 'active' : ''}`} onClick={() => void setTheme(t)}><span>{t === 'Light' ? <Sun size={15} /> : <Moon size={15} />}</span>{t}{activeTheme === t && <Check size={15} />}</button>)}</div>}
      <button className="setting-row" onClick={() => void toggleNotifications()}><span className="setting-icon"><Bell size={18} /></span><span className="setting-title">Reminders</span><span className={`toggle ${profile?.notifications_enabled ? 'on' : 'off'}`}><i /></span></button>
    </div></section>

    <section className="settings-section"><p className="eyebrow">LEGAL</p><div className="settings-card">
      <button type="button" className="setting-row" onClick={() => setPrivacyOpen(true)}>
        <span className="setting-icon"><FileText size={18} /></span>
        <span className="setting-title">Privacy policy</span>
        <ChevronRight size={16} className="setting-arrow" />
      </button>
    </div></section>

    <section className="danger-section"><p className="eyebrow danger-eyebrow">ACCOUNT</p>
      <div className="danger-card">
        <div className="danger-info">
          <span className="danger-icon"><Trash2 size={18} /></span>
          <div>
            <strong>Delete account</strong>
            <p>Permanently removes your sign-in and all habits, tasks, and goals.</p>
          </div>
        </div>
        <button type="button" className="danger-btn" onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); }}>Delete</button>
      </div>
    </section>

    <button className="logout-button" onClick={onSignOut}><LogOut size={17} /> Log out</button>

    {deleteOpen && (
      <div className="modal-overlay" onClick={() => !deleting && setDeleteOpen(false)}>
        <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
          <div className="delete-modal-header">
            <span className="delete-modal-icon"><Trash2 size={22} /></span>
            <h3 id="delete-account-title">Delete your account?</h3>
          </div>
          <p className="delete-modal-body">This cannot be undone. Your email, habits, tasks, goals, and reminders will be removed.</p>
          <div className="delete-confirm-field">
            <label htmlFor="delete-confirm">Type <strong>DELETE</strong> to confirm</label>
            <input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="delete-modal-actions">
            <button type="button" className="button button-light" disabled={deleting} onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button type="button" className="danger-btn confirm" disabled={deleting || deleteConfirm !== 'DELETE'} onClick={() => void handleDeleteAccount()}>
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </div>
      </div>
    )}

    {toasts.length > 0 && (
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            {t.tone === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    )}
  </div>;
}
