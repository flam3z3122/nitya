export type Screen = 'today' | 'tasks' | 'habits' | 'progress' | 'profile';

export type Task = {
  id: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  completionHistory: string[];
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  streak: number;
  completed: boolean;
  history: string[];
  skips: string[];
  reminder_time: string | null;
  created_at: string;
};

export type Goal = {
  id: string;
  title: string;
  notes: string;
  target: number;
  progress: number;
};

export type ProfileSettings = {
  name: string;
  email: string;
  theme: 'Light' | 'Dark' | 'System';
  notifications_enabled: boolean;
  timezone: string;
  onboarded: boolean;
};

export type DataState = {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  completions: string[];
  profile: ProfileSettings | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
  pendingSync: number;
  syncing: boolean;
  syncFailure: 'network' | 'permanent' | null;
};
