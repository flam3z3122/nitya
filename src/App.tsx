import { useState } from 'react';
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

  if (auth.loading) {
    return <div className="loading-screen"><div className="loading-spinner" /><p>Loading your daymark\u2026</p></div>;
  }

  if (!auth.user) {
    return <AuthScreen mode={authMode} onModeChange={setAuthMode} onSubmit={authMode === 'signin' ? auth.signIn : auth.signUp} onResetPassword={auth.resetPassword} loading={auth.loading} error={auth.error} />;
  }

  if (data.profile && !data.profile.onboarded) {
    return <OnboardingScreen onComplete={data.completeOnboarding} loading={data.loading} error={data.error} />;
  }

  const page = data.loading ? <div className="loading-screen"><div className="loading-spinner" /><p>Loading your workspace\u2026</p></div> : data.error && !data.tasks.length && !data.habits.length ? <div className="error-screen"><h2>We couldn't load your workspace</h2><p>{data.error}</p><button className="button button-dark" onClick={() => void data.reload()}>Try again</button></div> : screen === 'today' ? <TodayPage tasks={data.tasks} habits={data.habits} goals={data.goals} onToggleTask={data.toggleTask} onToggleHabit={data.toggleHabit} onDeleteTask={data.deleteTask} onDeleteHabit={data.deleteHabit} onDeleteGoal={data.deleteGoal} onNavigate={setScreen} onQuickAdd={() => setQuickAddOpen(true)} userName={data.profile?.name} /> : screen === 'habits' ? <HabitsPage habits={data.habits} onToggle={data.toggleHabit} onDelete={data.deleteHabit} /> : screen === 'calendar' ? <CalendarPage completions={data.completions} /> : screen === 'statistics' ? <StatisticsPage tasks={data.tasks} habits={data.habits} /> : <ProfilePage profile={data.profile} authEmail={auth.user.email} emailVerified={auth.user.emailVerified} onSignOut={() => void auth.signOut()} onUpdateProfile={data.updateProfile} onResendVerification={auth.resendVerification} onDeleteAccount={data.deleteAccount} />;

  return <div className="app-shell"><Navigation active={screen} onChange={setScreen} userEmail={auth.user.email} /><main className="main-area">{data.error && data.tasks.length > 0 && <div className="data-warning">{data.error}</div>}{page}</main><QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen((value) => !value)} onCreateTask={data.createTask} onCreateHabit={data.createHabit} onCreateGoal={data.createGoal} /></div>;
}

export default App;
