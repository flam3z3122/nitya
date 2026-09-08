export type GoalSuggestion = {
  title: string;
  icon: string;
  notes: string;
  target: number;
};

export const goalSuggestions: GoalSuggestion[] = [
  { title: 'Launch my portfolio', icon: '\u{1F680}', notes: 'Ship a public site with three case studies.', target: 10 },
  { title: 'Run a 5K', icon: '\u{1F3C3}', notes: 'Build up to a continuous 5K without stopping.', target: 8 },
  { title: 'Read 12 books', icon: '\u{1F4DA}', notes: 'One book a month this year.', target: 12 },
  { title: 'Save an emergency fund', icon: '\u{1F4B0}', notes: 'Set aside a little each week.', target: 12 },
  { title: 'Learn a new skill', icon: '\u{1F3AF}', notes: 'Finish a course and a small project.', target: 6 },
  { title: 'Cook at home more', icon: '\u{1F373}', notes: 'Home-cooked dinners this month.', target: 16 },
  { title: 'Sleep before 11pm', icon: '\u{1F319}', notes: 'Weeknight wind-down and earlier lights out.', target: 20 },
  { title: 'Build a side project', icon: '\u{1F6E0}\u{FE0F}', notes: 'Ship an MVP people can try.', target: 10 },
];
