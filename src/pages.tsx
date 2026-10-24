import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Bell, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, FileText, Flame, ListChecks, Loader2, LogOut, Mail, Moon, Pencil, Sparkles, Sun, TrendingUp, Trash2, X } from 'lucide-react';
import { HabitCard } from '@/components/HabitCard';
import { EmptyState } from '@/components/EmptyState';
import { completedHabitsOn, currentWeekDays, dateKey, daysInMonth, formatReminderTime, isWeeklyHabit, localDateKey, mondayOffset, shiftMonth, todayKey } from '@/lib/activity';
import { requestReminderPermission } from '@/hooks/useReminders';
import { isAndroid, isNative } from '@/lib/capacitor';
import { registerBackIntercept } from '@/lib/backHandler';
import { ProgressCard } from '@/components/ProgressCard';
import { TaskCard } from '@/components/TaskCard';
import { FieldRequirement } from '@/components/FieldRequirement';
import { GoalCard } from '@/components/GoalCard';
import { StatsCard } from '@/components/StatsCard';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { BannerAd } from '@/components/BannerAd';
import type { PermissionState } from '@capacitor/core';
import type { Goal, Habit, ProfileSettings, Screen, Task } from '@/types';

type TodayProps = { tasks: Task[]; habits: Habit[]; goals: Goal[]; onToggleTask: (id: string, completed: boolean) => Promise<void>; onToggleHabit: (id: string, completed: boolean) => Promise<void>; onDeleteTask: (id: string) => Promise<void>; onDeleteHabit: (id: string) => Promise<void>; onDeleteGoal: (id: string) => Promise<void>; onNavigate: (screen: Screen) => void; onQuickAdd: (type?: 'task' | 'habit' | 'goal') => void; onEditTask: (id: string) => void; onEditHabit: (id: string) => void; onEditGoal: (id: string) => void; onCheckInGoal: (id: string) => void; onMarkPrevious: (id: string) => void; onSkipPrevious: (id: string) => void; onUndoSkip: (id: string) => void; userName?: string };

const pageMeta: Record<Screen, { eyebrow: string; title: string }> = { today: { eyebrow: '', title: '' }, tasks: { eyebrow: 'YOUR LIST', title: 'Tasks' }, habits: { eyebrow: 'YOUR ROUTINES', title: 'Habits' }, progress: { eyebrow: 'YOUR MOMENTUM', title: 'Progress' }, profile: { eyebrow: 'YOUR SPACE', title: 'Profile' } };

function getGreeting() { const hour = new Date().getHours(); if (hour < 12) return 'Good morning'; if (hour < 18) return 'Good afternoon'; return 'Good evening'; }

function formatDate() { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase(); }

export function PageHeader({ screen, action, userName }: { screen: Screen; action?: React.ReactNode; userName?: string }) { const meta = pageMeta[screen]; const eyebrow = screen === 'today' ? formatDate() : meta.eyebrow; const title = screen === 'today' ? `${getGreeting()}, ${userName ?? 'there'}` : meta.title; return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="header-actions">{action}</div></header>; }

export function TodayPage({ tasks, habits, goals, onToggleTask, onToggleHabit, onDeleteTask, onDeleteGoal, onNavigate, onQuickAdd, onEditTask, onEditHabit, onEditGoal, onCheckInGoal, onMarkPrevious, onSkipPrevious, onUndoSkip, userName }: TodayProps) {
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [showAllGoals, setShowAllGoals] = useState(false);
  const today = todayKey();
  const todayTasks = useMemo(
    () => [...tasks]
      .reverse()
      .filter((task) =>
        !task.completed
        || task.dueDate === today
        || (task.dueDate !== null
          && task.dueDate < today
          && task.completedAt !== null
          && localDateKey(new Date(task.completedAt)) === today)
      )
      .sort((a, b) => {
        const rank = (task: Task) => task.completed
          ? 4
          : task.dueDate === null
            ? 3
            : task.dueDate < today
              ? 0
              : task.dueDate === today
                ? 1
                : 2;
        const rankDifference = rank(a) - rank(b);
        if (rankDifference !== 0) return rankDifference;
        if (a.dueDate === null || b.dueDate === null) return 0;
        return a.dueDate.localeCompare(b.dueDate);
      }),
    [tasks, today],
  );
  const completed = todayTasks.filter((task) =>
    task.completed
    && task.dueDate !== null
    && task.dueDate <= today
    && task.completedAt !== null
    && localDateKey(new Date(task.completedAt)) === today
  ).length + habits.filter((habit) => habit.completed).length;
  const reminders = habits.filter((habit) => habit.reminder_time).slice().sort((a, b) => (a.reminder_time ?? '').localeCompare(b.reminder_time ?? ''));
  const displayHabits = showAllHabits ? habits : habits.slice(0, 3);
  const displayGoals = showAllGoals ? goals : goals.slice(0, 3);
  const topHabit = habits.reduce<Habit | null>((best, habit) => (!best || habit.streak > best.streak ? habit : best), null);
  const bestStreak = topHabit?.streak ?? 0;
  const streakUnit = topHabit && isWeeklyHabit(topHabit.frequency)
    ? (bestStreak === 1 ? 'week' : 'weeks')
    : (bestStreak === 1 ? 'day' : 'days');
  return (
    <div className="page-content">
      <BannerAd />
      <PageHeader screen="today" userName={userName} />
      <div className="today-layout">
        <div className="today-main">
          <ProgressCard completed={completed} total={todayTasks.length + habits.length} />
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
                <>
                  {displayHabits.map((habit) => (
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
                  ))}
                  {habits.length > 3 && (
                    <button className="show-more-btn" onClick={() => setShowAllHabits((value) => !value)}>
                      {showAllHabits ? <>Show less <ChevronUp size={14} /></> : <>+{habits.length - 3} more <ChevronDown size={14} /></>}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
          <section className="content-section">
            <div className="section-heading">
              <div><p className="eyebrow">FOCUS FOR TODAY</p><h2>Today&apos;s tasks</h2></div>
              <button className="text-button" onClick={() => onNavigate('tasks')}>View all <ArrowRight size={15} /></button>
            </div>
            <div className="task-list">
              {todayTasks.length === 0 ? (
                <EmptyState
                  title={tasks.length === 0 ? 'No tasks yet' : 'No open tasks'}
                  message={tasks.length === 0
                    ? 'Add something you want to get done today.'
                    : 'You’re all caught up. Add a task whenever something comes up.'}
                  actionLabel="Add a task"
                  onAction={() => onQuickAdd('task')}
                />
              ) : (
                todayTasks.map((task) => <TaskCard key={task.id} task={task} onToggle={(id) => void onToggleTask(id, !task.completed)} onDelete={(id) => void onDeleteTask(id)} onEdit={onEditTask} />)
              )}
            </div>
          </section>
          {goals.length > 0 && (
            <section className="content-section">
              <div className="section-heading">
                <div><p className="eyebrow">YOUR MILESTONES</p><h2>Goals</h2></div>
              </div>
              <div className="goal-list">
                {displayGoals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={(id) => void onDeleteGoal(id)} onEdit={onEditGoal} onCheckIn={onCheckInGoal} />)}
                {goals.length > 3 && (
                  <button className="show-more-btn" onClick={() => setShowAllGoals((value) => !value)}>
                    {showAllGoals ? <>Show less <ChevronUp size={14} /></> : <>+{goals.length - 3} more <ChevronDown size={14} /></>}
                  </button>
                )}
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
    .reverse()
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
          actionLabel="Add a task"
          onAction={() => onQuickAdd('task')}
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
  const tasksOnDay = tasks.filter((task) => task.completionHistory.some((completedAt) => localDateKey(new Date(completedAt)) === selectedKey));
  const total = tasks.length + habits.length;
  const completionRate = (key: string) => {
    const completedTasks = tasks.filter((task) => task.completionHistory.some((completedAt) => localDateKey(new Date(completedAt)) === key)).length;
    const completedHabits = completedHabitsOn(habits, key).length;
    return total ? Math.round(((completedTasks + completedHabits) / total) * 100) : 0;
  };
  const today = todayKey();
  const completed = tasks.filter((task) => task.completed && task.completedAt && localDateKey(new Date(task.completedAt)) === today).length
    + habits.filter((habit) => habit.completed).length;
  const score = total ? Math.round((completed / total) * 100) : 0;
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = localDateKey(date);
    return {
      key,
      label: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      rate: completionRate(key),
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
                  className={`calendar-day ${selected === cell.day ? 'selected' : ''} ${completionRate(cell.key) > 0 ? 'has-activity' : ''}`}
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
            <div><span>Completion</span><strong>{completionRate(selectedKey)}%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${completionRate(selectedKey)}%` }} /></div>
          </div>
          <div className="detail-items">
            <p className="eyebrow">TASKS</p>
            {tasksOnDay.length === 0 ? (
              <div className="detail-item">
                <span className="detail-item-icon yellow"><ListChecks size={17} /></span>
                <div><strong>No tasks completed</strong><small>Completed tasks will appear here</small></div>
              </div>
            ) : tasksOnDay.map((task) => (
              <div className="detail-item" key={task.id}>
                <span className="detail-item-icon green"><ListChecks size={17} /></span>
                <div><strong>{task.title}</strong><small>{task.priority} priority</small></div>
                <span className="detail-check"><Check size={16} /></span>
              </div>
            ))}
            <p className="eyebrow">HABITS</p>
            {doneOnDay.length === 0 ? (
              <div className="detail-item">
                <span className="detail-item-icon yellow"><Flame size={17} /></span>
                <div><strong>No habits completed</strong><small>Completed habits will appear here</small></div>
              </div>
            ) : doneOnDay.map((habit) => (
              <div className="detail-item" key={habit.id}>
                <span className={`detail-item-icon green habit-icon habit-${habit.color}`}>{habit.icon}</span>
                <div><strong>{habit.name}</strong><small>{habit.frequency}</small></div>
                <span className="detail-check"><Check size={16} /></span>
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
  nativeReminderPermission: PermissionState | null;
  nativeReminderOptIn: boolean;
  nativeReminderError: string | null;
  onRequestNativeReminderPermission: () => Promise<boolean>;
  onSetNativeReminderOptIn: (enabled: boolean) => void;
  onSignOut: () => void;
  onUpdateProfile: (updates: Partial<Pick<ProfileSettings, 'name' | 'theme' | 'notifications_enabled'>>) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
};

type Toast = { id: number; message: string; tone: 'success' | 'error' };

export function ProfilePage({ profile, authEmail, nativeReminderPermission, nativeReminderOptIn, nativeReminderError, onRequestNativeReminderPermission, onSetNativeReminderOptIn, onSignOut, onUpdateProfile, onDeleteAccount }: ProfilePageProps) {
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

  useEffect(() => {
    if (privacyOpen) return registerBackIntercept(() => { setPrivacyOpen(false); return true; });
    return;
  }, [privacyOpen]);

  useEffect(() => {
    if (deleteOpen && !deleting) return registerBackIntercept(() => { setDeleteOpen(false); return true; });
    return;
  }, [deleteOpen, deleting]);
  const name = profile?.name ?? 'Your name';
  const email = profile?.email ?? authEmail ?? '';
  const themes: Array<'Light' | 'Dark'> = ['Light', 'Dark'];
  const activeTheme: 'Light' | 'Dark' = profile?.theme === 'Dark' ? 'Dark' : 'Light';
  const notificationsOn = isAndroid()
    ? nativeReminderPermission === 'granted' && nativeReminderOptIn
    : profile?.notifications_enabled !== false;

  const showToast = useCallback((message: string, tone: 'success' | 'error') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4000);
  }, []);

  const saveName = async () => {
    if (!nameValue.trim()) return;
    setNameSaving(true);
    try {
      await onUpdateProfile({ name: nameValue.trim() });
      setEditingName(false);
      showToast('Name updated.', 'success');
    } catch {
      showToast('Name could not be saved. Please try again.', 'error');
    } finally {
      setNameSaving(false);
    }
  };
  const setTheme = async (theme: 'Light' | 'Dark') => {
    setThemeOpen(false);
    setSavingKey('theme');
    try {
      await onUpdateProfile({ theme });
    } catch {
      showToast('Appearance could not be saved. Please try again.', 'error');
    } finally {
      setSavingKey(null);
    }
  };
  const toggleNotifications = async () => {
    if (isNative() && !isAndroid()) {
      showToast('Native reminders are coming soon.', 'error');
      return;
    }
    const currentlyOn = notificationsOn;
    const next = !currentlyOn;
    setSavingKey('notifications');
    let failureStage = 'checking notification permission';
    try {
      if (isAndroid() && next) {
        failureStage = 'requesting Android notification permission';
        const allowed = await onRequestNativeReminderPermission();
        if (!allowed) {
          showToast('Notifications were not enabled. You can allow them in Android Settings.', 'error');
          return;
        }
      } else if (next) {
        failureStage = 'requesting browser notification permission';
        const allowed = await requestReminderPermission();
        if (!allowed) {
          showToast('Allow notifications in your browser to get reminders.', 'error');
          return;
        }
      }
      if (isAndroid()) {
        failureStage = 'saving your reminder preference on this device';
        onSetNativeReminderOptIn(next);
      } else {
        failureStage = 'saving your reminder preference to your account';
        await onUpdateProfile({ notifications_enabled: next });
      }
    } catch (error) {
      console.error(`Could not enable reminders while ${failureStage}.`, error);
      const detail = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unknown error';
      showToast(`Reminder settings failed while ${failureStage}: ${detail}`, 'error');
    } finally {
      setSavingKey(null);
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
          <div className="profile-name-field">
            <FieldRequirement label="Your name" required />
            <input
              className="profile-name-input"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
              aria-required="true"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName();
                if (e.key === 'Escape') { setEditingName(false); setNameValue(profile?.name ?? ''); }
              }}
            />
          </div>
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
        <span className="setting-title">{email}</span>
      </div>
    </div></section>

    <section className="settings-section"><p className="eyebrow">PREFERENCES</p><div className="settings-card">
      <button className="setting-row" onClick={() => setThemeOpen((v) => !v)}><span className="setting-icon"><Moon size={18} /></span><span className="setting-title">Appearance</span><span className="setting-value">{savingKey === 'theme' ? 'Saving\u2026' : activeTheme}</span>{themeOpen ? <ChevronRight size={16} className="setting-arrow up" /> : <ChevronRight size={16} className="setting-arrow" />}</button>
      {themeOpen && <div className="setting-options">{themes.map((t) => <button key={t} className={`setting-option ${activeTheme === t ? 'active' : ''}`} onClick={() => void setTheme(t)}><span>{t === 'Light' ? <Sun size={15} /> : <Moon size={15} />}</span>{t}{activeTheme === t && <Check size={15} />}</button>)}</div>}
      <button className="setting-row" disabled={savingKey === 'notifications'} onClick={() => void toggleNotifications()}><span className="setting-icon"><Bell size={18} /></span><span className="setting-title">{isAndroid() || !isNative() ? 'Reminders' : 'Reminders (coming soon)'}</span>{isNative() && !isAndroid() ? <span className="setting-value">soon</span> : <><span className="setting-value">{savingKey === 'notifications' ? 'Saving\u2026' : isAndroid() && nativeReminderPermission === 'denied' ? 'Allow in Settings' : ''}</span><span className={`toggle ${notificationsOn ? 'on' : 'off'}`}><i /></span></>}</button>
      {isAndroid() && nativeReminderError && <p className="auth-field-error" role="alert">{nativeReminderError}</p>}
    </div></section>

    <section className="settings-section"><p className="eyebrow">LEGAL</p><div className="settings-card">
      <button type="button" className="setting-row" onClick={() => setPrivacyOpen(true)}>
        <span className="setting-icon"><FileText size={18} /></span>
        <span className="setting-title">Privacy policy</span>
        <ChevronRight size={16} className="setting-arrow" />
      </button>
    </div></section>

    <section className="settings-section"><p className="eyebrow danger-eyebrow">ACCOUNT</p>
      <div className="settings-card">
        <div className="setting-row danger-row">
          <span className="setting-icon"><Trash2 size={18} /></span>
          <span className="setting-title">Delete account</span>
          <button type="button" className="danger-btn" onClick={() => { setDeleteOpen(true); setDeleteConfirm(''); }}>Delete</button>
        </div>
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
            <FieldRequirement label="Confirmation" required />
            <label htmlFor="delete-confirm">Type <strong>DELETE</strong> to confirm</label>
            <input
              id="delete-confirm"
              required
              aria-required="true"
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
