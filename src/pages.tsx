import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, Check, ChevronLeft, ChevronRight, Clock3, Flame, ListChecks, Loader2, LogOut, Mail, Moon, Pencil, ShieldAlert, ShieldCheck, Sparkles, Sun, TrendingUp, X } from 'lucide-react';
import { HabitCard } from '@/components/HabitCard';
import { EmptyState } from '@/components/EmptyState';
import { completedHabitsOn, currentWeekDays, dateKey, dayCompletionRate, daysInMonth, formatReminderTime, isWeeklyHabit, localDateKey, mondayOffset, shiftMonth, todayKey } from '@/lib/activity';
import { requestReminderPermission } from '@/hooks/useReminders';
import { ProgressCard } from '@/components/ProgressCard';
import { TaskCard } from '@/components/TaskCard';
import { GoalCard } from '@/components/GoalCard';
import { StatsCard } from '@/components/StatsCard';
import type { Goal, Habit, ProfileSettings, Screen, Task } from '@/types';

type TodayProps = { tasks: Task[]; habits: Habit[]; goals: Goal[]; onToggleTask: (id: string, completed: boolean) => Promise<void>; onToggleHabit: (id: string, completed: boolean) => Promise<void>; onDeleteTask: (id: string) => Promise<void>; onDeleteHabit: (id: string) => Promise<void>; onDeleteGoal: (id: string) => Promise<void>; onNavigate: (screen: Screen) => void; onQuickAdd: (type?: 'task' | 'habit' | 'goal') => void; onEditTask: (id: string) => void; onEditHabit: (id: string) => void; onEditGoal: (id: string) => void; onMarkPrevious: (id: string) => void; onSkipPrevious: (id: string) => void; onUndoSkip: (id: string) => void; userName?: string };

const pageMeta: Record<Screen, { eyebrow: string; title: string }> = { today: { eyebrow: '', title: '' }, tasks: { eyebrow: 'YOUR LIST', title: 'Tasks' }, habits: { eyebrow: 'YOUR ROUTINES', title: 'Habits' }, progress: { eyebrow: 'YOUR MOMENTUM', title: 'Progress' }, profile: { eyebrow: 'YOUR SPACE', title: 'Profile' } };

function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening'; }

function formatDate() { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(); }

export function PageHeader({ screen, action, userName }: { screen: Screen; action?: React.ReactNode; userName?: string }) { const meta = pageMeta[screen]; const eyebrow = screen === 'today' ? formatDate() : meta.eyebrow; const title = screen === 'today' ? `${getGreeting()}, ${userName ?? 'there'}` : meta.title; return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="header-actions">{action}</div></header>; }

export function TodayPage({ tasks, habits, goals, onToggleTask, onToggleHabit, onDeleteTask, onDeleteHabit, onDeleteGoal, onNavigate, onQuickAdd, onEditTask, onEditHabit, onEditGoal, onMarkPrevious, onSkipPrevious, onUndoSkip, userName }: TodayProps) {
  const completed = tasks.filter((task) => task.completed).length + habits.filter((habit) => habit.completed).length;
  const reminders = habits.filter((habit) => habit.reminder_time).slice().sort((a, b) => (a.reminder_time ?? '').localeCompare(b.reminder_time ?? ''));
  const visibleTasks = tasks.slice(0, 3);
  const remainingTasks = Math.max(0, tasks.length - visibleTasks.length);
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
          {goals.length > 0 && (
            <section className="content-section">
              <div className="section-heading">
                <div><p className="eyebrow">YOUR MILESTONES</p><h2>Goals</h2></div>
              </div>
              <div className="goal-list">
                {goals.slice(0, 3).map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={(id) => void onDeleteGoal(id)} onEdit={onEditGoal} />)}
              </div>
            </section>
          )}
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
        </div>
        <aside className="today-aside">
          <div className="streak-card">
            <div className="streak-card-top">
              <div className="streak-flame"><Flame size={21} fill="currentColor" /></div>
              <span>KEEP IT GOING</span>
            </div>
            <strong>{Math.max(0, ...habits.map((habit) => habit.streak))}</strong>
            <p>day current streak</p>
            <div className="streak-days">
              {currentWeekDays().map((day) => {
                const done = completedHabitsOn(habits, day.key).length > 0;
                return <div key={day.key} className={done ? 'done' : ''}><span>{day.label}</span><i>{done ? '\u2713' : ''}</i></div>;
              })}
            </div>
          </div>
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
  emailVerified: boolean;
  onSignOut: () => void;
  onUpdateProfile: (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled'>>) => Promise<void>;
  onResendVerification: () => Promise<{ error: string | null }>;
};

type Toast = { id: number; message: string; tone: 'success' | 'error' };

export function ProfilePage({ profile, authEmail, emailVerified, onSignOut, onUpdateProfile, onResendVerification }: ProfilePageProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
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

  const handleResend = async () => {
    setResending(true);
    const result = await onResendVerification();
    setResending(false);
    if (result.error) showToast(result.error, 'error');
    else showToast('Verification email sent. Check your inbox.', 'success');
  };

  return <div className="page-content"><PageHeader screen="profile" />
    {editingName ? <section className="profile-card editing"><div className="avatar avatar-large">{(nameValue || 'A').split(' ').map((p) => p[0]).join('').slice(0, 2)}</div><div className="profile-edit-form"><input className="profile-name-input" value={nameValue} onChange={(e) => setNameValue(e.target.value)} placeholder="Your name" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); }} /><div className="profile-edit-actions"><button className="button button-dark" disabled={nameSaving || !nameValue.trim()} onClick={() => void saveName()}>{nameSaving ? 'Saving\u2026' : 'Save'}</button><button className="icon-button" onClick={() => { setEditingName(false); setNameValue(profile?.name ?? ''); }} aria-label="Cancel"><X size={17} /></button></div></div></section>
    : <section className="profile-card"><div className="avatar avatar-large">{name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><h2>{name}</h2><p>{email}</p><span className="member-pill"><Sparkles size={12} /> Personal workspace</span></div><button className="icon-button profile-edit-btn" onClick={() => { setNameValue(profile?.name ?? ''); setEditingName(true); }} aria-label="Edit name"><Pencil size={16} /></button></section>}

    <section className="settings-section"><p className="eyebrow">EMAIL</p><div className="settings-card">
      <div className="setting-row email-row">
        <span className="setting-icon"><Mail size={18} /></span>
        <div className="email-row-content">
          <span className="setting-title">{email}</span>
          <span className={`verify-badge ${emailVerified ? 'verified' : 'unverified'}`}>
            {emailVerified ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            {emailVerified ? 'Verified' : 'Unverified'}
          </span>
        </div>
      </div>
      {!emailVerified && (
        <div className="resend-section">
          <button className="resend-btn" disabled={resending} onClick={() => void handleResend()}>
            {resending ? <Loader2 size={15} className="spin" /> : <Mail size={15} />}
            {resending ? 'Sending\u2026' : 'Resend verification email'}
          </button>
        </div>
      )}
    </div></section>

    <section className="settings-section"><p className="eyebrow">PREFERENCES</p><div className="settings-card">
      <button className="setting-row" onClick={() => setThemeOpen((v) => !v)}><span className="setting-icon"><Moon size={18} /></span><span className="setting-title">Appearance</span><span className="setting-value">{savingKey === 'theme' ? 'Saving\u2026' : activeTheme}</span>{themeOpen ? <ChevronRight size={16} className="setting-arrow up" /> : <ChevronRight size={16} className="setting-arrow" />}</button>
      {themeOpen && <div className="setting-options">{themes.map((t) => <button key={t} className={`setting-option ${activeTheme === t ? 'active' : ''}`} onClick={() => void setTheme(t)}><span>{t === 'Light' ? <Sun size={15} /> : <Moon size={15} />}</span>{t}{activeTheme === t && <Check size={15} />}</button>)}</div>}
      <button className="setting-row" onClick={() => void toggleNotifications()}><span className="setting-icon"><Bell size={18} /></span><span className="setting-title">Reminders</span><span className={`toggle ${profile?.notifications_enabled ? 'on' : 'off'}`}><i /></span></button>
    </div></section>

    <button className="logout-button" onClick={onSignOut}><LogOut size={17} /> Log out</button>

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
