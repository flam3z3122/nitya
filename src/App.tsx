import { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { QuickAdd } from '@/components/QuickAdd';
import { AuthScreen } from '@/components/AuthScreen';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { EditModal } from '@/components/EditModal';
import type { EditItem, EditType, EditUpdates } from '@/components/EditModal';
import {
  TodayPage,
  TasksPage,
  HabitsPage,
  ProgressPage,
  ProfilePage,
} from '@/pages';
import { useAuth } from '@/hooks/useAuth';
import { useProductivityData } from '@/hooks/useProductivityData';
import { useHashRoute } from '@/hooks/useHashRoute';
import { useReminders } from '@/hooks/useReminders';
import type { Goal, Habit, Task } from '@/types';

function App() {
  const [screen, setScreen] = useHashRoute();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickIntent, setQuickIntent] = useState<'task' | 'habit' | 'goal' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const auth = useAuth();
  const data = useProductivityData(auth.user?.id ?? null);
  useReminders(data.habits, data.profile?.notifications_enabled !== false);

  useEffect(() => {
    const mode = data.profile?.theme ?? 'Light';

    if (mode === 'Dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.profile?.theme]);

  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<EditType | null>(null);
  const [editItem, setEditItem] = useState<EditItem | null>(null);

  const openEdit = (type: EditType, id: string) => {
    const item =
      type === 'task'
        ? data.tasks.find((task) => task.id === id) ?? null
        : type === 'habit'
          ? data.habits.find((habit) => habit.id === id) ?? null
          : data.goals.find((goal) => goal.id === id) ?? null;

    if (!item) return;

    setEditItem(item);
    setEditType(type);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditType(null);
    setEditItem(null);
  };

  const openQuickAdd = (type?: 'task' | 'habit' | 'goal') => {
    const intent = type === 'task' || type === 'habit' || type === 'goal' ? type : null;
    setQuickIntent(intent);
    setQuickAddOpen(true);
  };

  const saveEdit = async (id: string, updates: EditUpdates) => {
    if (editType === 'task') {
      await data.updateTask(id, updates as Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time'>>);
    }

    if (editType === 'habit') {
      await data.updateHabit(id, updates as Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>>);
    }

    if (editType === 'goal') {
      await data.updateGoal(id, updates as Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>>);
    }
  };

  if (auth.loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading your daymark…</p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <AuthScreen
        mode={authMode}
        onModeChange={setAuthMode}
        onSubmit={
          authMode === 'signin'
            ? auth.signIn
            : auth.signUp
        }
        onResetPassword={auth.resetPassword}
        onClearFeedback={auth.clearFeedback}
        loading={auth.busy}
        error={auth.error}
        notice={auth.notice}
      />
    );
  }

  if (data.profile && !data.profile.onboarded) {
    return (
      <OnboardingScreen
        onComplete={data.completeOnboarding}
        loading={data.loading}
        error={data.error}
      />
    );
  }

  const page =
    data.loading ? (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading your workspace…</p>
      </div>
    ) : data.error &&
      !data.tasks.length &&
      !data.habits.length ? (
      <div className="error-screen">
        <h2>We couldn't load your workspace</h2>
        <p>{data.error}</p>
        <button
          className="button button-dark"
          onClick={() => void data.reload()}
        >
          Try again
        </button>
      </div>
    ) : screen === 'today' ? (
      <TodayPage
        tasks={data.tasks}
        habits={data.habits}
        goals={data.goals}
        onToggleTask={data.toggleTask}
        onToggleHabit={data.toggleHabit}
        onDeleteTask={data.deleteTask}
        onDeleteHabit={data.deleteHabit}
        onDeleteGoal={data.deleteGoal}
        onNavigate={setScreen}
        onQuickAdd={openQuickAdd}
        onEditTask={(id) => openEdit('task', id)}
        onEditHabit={(id) => openEdit('habit', id)}
        onEditGoal={(id) => openEdit('goal', id)}
        onCheckInGoal={(id) => void data.checkInGoal(id)}
        onMarkPrevious={data.markPreviousPeriod}
        onSkipPrevious={data.skipPreviousPeriod}
        onUndoSkip={data.undoSkipPreviousPeriod}
        userName={data.profile?.name}
      />
    ) : screen === 'tasks' ? (
      <TasksPage
        tasks={data.tasks}
        onToggle={data.toggleTask}
        onDelete={data.deleteTask}
        onQuickAdd={openQuickAdd}
        onEdit={(id) => openEdit('task', id)}
      />
    ) : screen === 'habits' ? (
      <HabitsPage
        habits={data.habits}
        onToggle={data.toggleHabit}
        onDelete={data.deleteHabit}
        onQuickAdd={openQuickAdd}
        onEdit={(id) => openEdit('habit', id)}
        onMarkPrevious={data.markPreviousPeriod}
        onSkipPrevious={data.skipPreviousPeriod}
        onUndoSkip={data.undoSkipPreviousPeriod}
      />
    ) : screen === 'progress' ? (
      <ProgressPage
        tasks={data.tasks}
        habits={data.habits}
      />
    ) : (
      <ProfilePage
        profile={data.profile}
        authEmail={auth.user?.email ?? ''}
        emailVerified={auth.user?.emailVerified ?? false}
        onSignOut={() => void auth.signOut()}
        onUpdateProfile={data.updateProfile}
        onResendVerification={auth.resendVerification}
        onDeleteAccount={async () => {
          await data.deleteAccount();
          await auth.signOut();
        }}
      />
    );

  return (
    <div className="app-shell">
      <Navigation
        active={screen}
        onChange={setScreen}
        userEmail={auth.user?.email ?? ''}
      />

      <main className="main-area">
        {data.error && data.tasks.length > 0 && (
          <div className="data-warning">
            {data.error}
          </div>
        )}

        {page}
      </main>

      <QuickAdd
        open={quickAddOpen}
        intent={quickIntent}
        onOpen={openQuickAdd}
        onClose={() => {
          setQuickAddOpen(false);
          setQuickIntent(null);
        }}
        onCreateTask={data.createTask}
        onCreateHabit={data.createHabitWithDetails}
        onCreateGoal={data.createGoal}
      />

      <EditModal
        open={editOpen}
        type={editType}
        item={editItem}
        onClose={closeEdit}
        onSave={saveEdit}
      />
    </div>
  );
}

export default App;
