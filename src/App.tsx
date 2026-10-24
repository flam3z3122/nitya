import { useCallback, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { PermissionState } from '@capacitor/core';
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
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import { registerBackIntercept } from '@/lib/backHandler';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useInterstitialAds } from '@/hooks/useInterstitialAds';
import {
  checkNativeReminderPermission,
  hasRequestedNativeReminderPermissionAtStartup,
  markNativeReminderPermissionRequestedAtStartup,
  readNativeReminderOptIn,
  requestNativeReminderPermission,
  writeNativeReminderOptIn,
} from '@/lib/nativeReminders';
import { isAndroid } from '@/lib/capacitor';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SplashLoader } from '@/components/SplashLoader';
import type { Goal, Habit, Task } from '@/types';

function App() {
  const [screen, setScreen] = useHashRoute();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickIntent, setQuickIntent] = useState<'task' | 'habit' | 'goal' | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [appActive, setAppActive] = useState(true);
  const [nativeReminderPermission, setNativeReminderPermission] = useState<PermissionState | null>(null);
  const [nativeReminderOptIn, setNativeReminderOptIn] = useState(false);

  const auth = useAuth();
  const data = useProductivityData(auth.user?.id ?? null);
  const online = useOnlineStatus();
  useInterstitialAds(
    auth.user?.id ?? null,
    !auth.loading && !data.loading && Boolean(auth.user && data.profile?.onboarded),
    appActive,
  );
  const remindersEnabled = isAndroid()
    ? Boolean(data.profile?.onboarded && nativeReminderPermission === 'granted' && nativeReminderOptIn)
    : data.profile?.notifications_enabled !== false;
  const nativeReminderError = useReminders(data.habits, remindersEnabled, auth.user?.id ?? null);

  useEffect(() => {
    if (!isAndroid()) return;
    let active = true;
    const refreshPermission = async () => {
      try {
        const permission = await checkNativeReminderPermission();
        if (active) setNativeReminderPermission(permission);
      } catch (error) {
        console.error('Could not check Android notification permission.', error);
      }
    };
    void refreshPermission();
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!active) return;
      setAppActive(isActive);
      if (isActive) void refreshPermission();
    });
    return () => {
      active = false;
      void listener.then((handle) => handle.remove()).catch((error: unknown) => {
        console.error('Could not remove Android app-state listener.', error);
      });
    };
  }, []);

  useEffect(() => {
    const userId = auth.user?.id;
    if (!isAndroid() || !userId) {
      setNativeReminderOptIn(false);
      return;
    }
    try {
      setNativeReminderOptIn(readNativeReminderOptIn(userId));
    } catch (error) {
      console.error('Could not read the Android reminder preference.', error);
      setNativeReminderOptIn(false);
    }
  }, [auth.user?.id]);

  const saveNativeReminderOptIn = useCallback((enabled: boolean) => {
    const userId = auth.user?.id;
    if (!userId) return;
    writeNativeReminderOptIn(userId, enabled);
    setNativeReminderOptIn(enabled);
  }, [auth.user?.id]);

  const requestNativeReminder = useCallback(async () => {
    const granted = await requestNativeReminderPermission();
    const permission = await checkNativeReminderPermission();
    setNativeReminderPermission(permission);
    if (granted) saveNativeReminderOptIn(true);
    return granted;
  }, [saveNativeReminderOptIn]);

  useEffect(() => {
    if (
      !isAndroid()
      || auth.loading
      || data.loading
      || !appActive
      || !auth.user
      || !data.profile?.onboarded
      || nativeReminderPermission === null
      || nativeReminderPermission === 'granted'
      || nativeReminderOptIn
    ) return;

    try {
      if (hasRequestedNativeReminderPermissionAtStartup()) return;
      markNativeReminderPermissionRequestedAtStartup();
      void requestNativeReminder().catch((error: unknown) => {
        console.error('Could not request Android notification permission at startup.', error);
      });
    } catch (error) {
      console.error('Could not record the Android notification permission request.', error);
    }
  }, [
    appActive,
    auth.loading,
    auth.user,
    data.loading,
    data.profile,
    nativeReminderOptIn,
    nativeReminderPermission,
    requestNativeReminder,
  ]);

  const completeOnboarding = async (
    name: string,
    selectedHabits: { name: string; icon: string; color: string; frequency: string }[],
    notificationsEnabled?: boolean,
  ) => {
    await data.completeOnboarding(name, selectedHabits, notificationsEnabled);
    if (isAndroid() && notificationsEnabled !== undefined) saveNativeReminderOptIn(notificationsEnabled);
  };

  useEffect(() => {
    const mode = data.profile?.theme ?? 'Light';

    if (mode === 'Dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [data.profile?.theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll('.main-area, .page-content').forEach((node) => {
      (node as HTMLElement).scrollTop = 0;
    });
  }, [screen]);

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

  useEffect(() => {
    if (editOpen) return registerBackIntercept(() => {
      closeEdit();
      return true;
    });
    return;
  }, [editOpen]);

  useEffect(() => {
    if (quickAddOpen) return registerBackIntercept(() => {
      setQuickAddOpen(false);
      setQuickIntent(null);
      return true;
    });
    return;
  }, [quickAddOpen]);

  useAndroidBackButton(screen, setScreen);

  const openQuickAdd = (type?: 'task' | 'habit' | 'goal') => {
    const intent = type === 'task' || type === 'habit' || type === 'goal' ? type : null;
    setQuickIntent(intent);
    setQuickAddOpen(true);
  };

  const saveEdit = async (id: string, updates: EditUpdates) => {
    if (editType === 'task') {
      await data.updateTask(id, updates as Partial<Pick<Task, 'title' | 'category' | 'priority' | 'time' | 'dueDate'>>);
    }

    if (editType === 'habit') {
      await data.updateHabit(id, updates as Partial<Pick<Habit, 'name' | 'icon' | 'color' | 'frequency' | 'reminder_time'>>);
    }

    if (editType === 'goal') {
      await data.updateGoal(id, updates as Partial<Pick<Goal, 'title' | 'notes' | 'target' | 'progress'>>);
    }
  };

  if (auth.loading) {
    return <SplashLoader message="Loading your Nitya…" />;
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
        onComplete={completeOnboarding}
        androidNative={isAndroid()}
        onRequestReminderPermission={requestNativeReminder}
        loading={data.loading}
        error={data.error}
      />
    );
  }

  const showWorkspaceSpinner =
    data.loading && !data.profile && data.tasks.length === 0 && data.habits.length === 0 && data.goals.length === 0;

  const page =
    showWorkspaceSpinner ? (
      <SplashLoader message="Loading your workspace…" />
    ) : data.error &&
      !data.profile &&
      !data.tasks.length &&
      !data.habits.length &&
      !data.goals.length ? (
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
        nativeReminderPermission={nativeReminderPermission}
        nativeReminderOptIn={nativeReminderOptIn}
        nativeReminderError={nativeReminderError}
        onRequestNativeReminderPermission={requestNativeReminder}
        onSetNativeReminderOptIn={saveNativeReminderOptIn}
        onSignOut={() => void auth.signOut()}
        onUpdateProfile={data.updateProfile}
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
        <OfflineBanner
          offline={data.offline}
          pendingSync={data.pendingSync}
          online={online}
          syncing={data.syncing}
          syncFailure={data.syncFailure}
          onRetry={() => void data.reload()}
        />
        {data.error && (data.tasks.length > 0 || data.habits.length > 0 || Boolean(data.profile)) && !data.offline && (
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
