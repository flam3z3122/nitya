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
  // history: list of YYYY-MM-DD dates when this habit was completed
  history?: string[];
};

export type Goal = {
  id: string;
  title: string;
};

export type ProfileSettings = {
  name: string;
  email: string;
  theme: 'Light' | 'Dark';
  onboarded: boolean;
};

export type DataState = {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  // Raw completion rows include the habit id so streaks can be recomputed accurately
  completionRows: { habit_id: string; completed_on: string }[];
  // Convenience list of completed dates (used by calendar UI)
  completions: string[];
  profile: ProfileSettings | null;
  loading: boolean;
  error: string | null;
};
