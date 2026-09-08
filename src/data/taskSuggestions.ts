import type { Task } from '@/types';

export type TaskSuggestion = {
  title: string;
  icon: string;
  category: string;
  priority: Task['priority'];
};

export const taskSuggestions: TaskSuggestion[] = [
  { title: 'Call the dentist', icon: '\u{1F4DE}', category: 'Health', priority: 'Medium' },
  { title: 'Reply to emails', icon: '\u{2709}\u{FE0F}', category: 'Work', priority: 'High' },
  { title: 'Grocery shopping', icon: '\u{1F6D2}', category: 'Personal', priority: 'Medium' },
  { title: 'Review study notes', icon: '\u{1F4DD}', category: 'Study', priority: 'Medium' },
  { title: 'Pay this month\'s bills', icon: '\u{1F4B3}', category: 'Personal', priority: 'High' },
  { title: 'Schedule a workout', icon: '\u{1F3C3}', category: 'Health', priority: 'Low' },
  { title: 'Prep tomorrow’s meeting', icon: '\u{1F4C5}', category: 'Work', priority: 'High' },
  { title: 'Tidy the desk', icon: '\u{1F9F9}', category: 'Personal', priority: 'Low' },
  { title: 'Book a check-up', icon: '\u{1FA7A}', category: 'Health', priority: 'Medium' },
  { title: 'Finish the assignment', icon: '\u{1F4DA}', category: 'Study', priority: 'High' },
];
