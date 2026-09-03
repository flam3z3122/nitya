import { useState, useEffect } from 'react';
import EditModal from '@/components/EditModal';
import { Navigation } from '@/components/Navigation';
import { QuickAdd } from '@/components/QuickAdd';
import { AuthScreen } from '@/components/AuthScreen';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { TodayPage, HabitsPage, CalendarPage, StatisticsPage, ProfilePage } from '@/pages';
import { useAuth } from '@/hooks/useAuth';
import { useProductivityData } from '@/hooks/useProductivityData';
import type { Screen } from '@/types';

function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const auth = useAuth();
  const data = useProductivityData(auth.user?.id ?? null);
  useEffect(() => {
    const mode = data.profile?.theme ?? 'Light';
    if (mode === 'Dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [data.profile?.theme]);

  // Edit modal state — declare hooks unconditionally to preserve hook order
  const [editOpen, setEditOpen] = useState(false);
  const [editType, setEditType] = useState<'task'|'habit'|'goal'|null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  if (auth.loading) {
    return <div className="loading-screen"><div className="loading-spinner" /><p>Loading your daymark\u2026</p></div>;
  }

  if (!auth.user) {
    return <AuthScreen mode={authMode} onModeChange={setAuthMode} onSubmit={authMode === 'signin' ? auth.signIn : auth.signUp} onResetPassword={auth.resetPassword} loading={auth.loading} error={auth.error} />;
  }

  if (data.profile && !data.profile.onboarded) {
    return <OnboardingScreen onComplete={data.completeOnboarding} loading={data.loading} error={data.error} />;
  }

    const openEdit = (type: 'task'|'habit'|'goal', id: string) => {
      if (type === 'task') setEditItem(data.tasks.find((t) => t.id === id));
      if (type === 'habit') setEditItem(data.habits.find((h) => h.id === id));
      if (type === 'goal') setEditItem(data.goals.find((g) => g.id === id));
      setEditType(type); setEditOpen(true);
    };
    const closeEdit = () => { setEditOpen(false); setEditType(null); setEditItem(null); };
    const saveEdit = async (id: string, updates: any) => {
      if (editType === 'task') await data.updateTask(id, updates);
      if (editType === 'habit') await data.updateHabit(id, updates);
      if (editType === 'goal') await data.updateGoal(id, updates);
    };

    const page = data.loading ? <div className="loading-screen"><div className="loading-spinner" /><p>Loading your workspace…</p></div> : data.error && !data.tasks.length && !data.habits.length ? <div className="error-screen"><h2>We couldn't load your workspace</h2><p>{data.error}</p><button className="button button-dark" onClick={() => void data.reload()}>Try again</button></div> : screen === 'today' ? <TodayPage tasks={data.tasks} habits={data.habits} goals={data.goals} onToggleTask={data.toggleTask} onToggleHabit={data.toggleHabit} onDeleteTask={data.deleteTask} onDeleteHabit={data.deleteHabit} onDeleteGoal={data.deleteGoal} onNavigate={setScreen} onQuickAdd={() => setQuickAddOpen(true)} onEditTask={(id) => openEdit('task', id)} onEditHabit={(id) => openEdit('habit', id)} onEditGoal={(id) => openEdit('goal', id)} userName={data.profile?.name} /> : screen === 'habits' ? <HabitsPage habits={data.habits} onToggle={data.toggleHabit} onDelete={data.deleteHabit} onQuickAdd={() => setQuickAddOpen(true)} onEdit={(id) => openEdit('habit', id)} /> : screen === 'calendar' ? <CalendarPage completions={data.completions} /> : screen === 'statistics' ? <StatisticsPage tasks={data.tasks} habits={data.habits} /> : <ProfilePage profile={data.profile} authEmail={auth.user.email} onSignOut={() => void auth.signOut()} onUpdateProfile={data.updateProfile} />;

    return <div className="app-shell"><Navigation active={screen} onChange={setScreen} userEmail={auth.user.email} /><main className="main-area">{data.error && data.tasks.length > 0 && <div className="data-warning">{data.error}</div>}{page}</main><QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen((value) => !value)} onCreateTask={data.createTask} onCreateHabit={data.createHabit} onCreateGoal={data.createGoal} /><EditModal open={editOpen} type={editType} item={editItem} onClose={closeEdit} onSave={saveEdit} /></div>;
}

export default App;
