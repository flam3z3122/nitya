export type Screen = 'today' | 'habits' | 'calendar' | 'statistics' | 'profile';

export type Task = {
  id: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  completed: boolean;
};

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  streak: number;
  completed: boolean;
};

export type Goal = {
  id: string;
  title: string;
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
};
