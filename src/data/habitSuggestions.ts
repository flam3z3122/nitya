export type HabitSuggestion = {
  name: string;
  icon: string;
  color: string;
  frequency: string;
};

export const goodHabitSuggestions: HabitSuggestion[] = [
  { name: 'Drink 8 glasses of water', icon: '\u{1F4A7}', color: 'blue', frequency: 'Daily' },
  { name: 'Morning exercise', icon: '\u{1F3CB}\u{FE0F}', color: 'mint', frequency: 'Daily' },
  { name: 'Read for 20 minutes', icon: '\u{1F4D6}', color: 'peach', frequency: 'Daily' },
  { name: 'Sleep before 11pm', icon: '\u{1F4A4}', color: 'lavender', frequency: 'Daily' },
  { name: 'Meditate for 5 minutes', icon: '\u{1F9D8}', color: 'lavender', frequency: 'Daily' },
  { name: 'Take a daily walk', icon: '\u{1F6B6}', color: 'mint', frequency: 'Daily' },
  { name: 'Eat a healthy breakfast', icon: '\u{1F963}', color: 'peach', frequency: 'Daily' },
  { name: 'Practice gratitude', icon: '\u{1F64F}', color: 'lavender', frequency: 'Daily' },
  { name: '10 minutes of stretching', icon: '\u{1F938}', color: 'mint', frequency: 'Daily' },
  { name: 'Journal before bed', icon: '\u{270D}\u{FE0F}', color: 'blue', frequency: 'Daily' },
  { name: 'No phone during meals', icon: '\u{1F4F4}', color: 'peach', frequency: 'Daily' },
  { name: 'Take daily vitamins', icon: '\u{1F48A}', color: 'blue', frequency: 'Daily' },
];

export const badHabitSuggestions: HabitSuggestion[] = [
  { name: 'Avoid late-night snacking', icon: '\u{1F30C}', color: 'peach', frequency: 'Daily' },
  { name: 'Limit social media to 30min', icon: '\u{1F4F1}', color: 'lavender', frequency: 'Daily' },
  { name: 'Stop hitting snooze', icon: '\u{23F0}', color: 'blue', frequency: 'Daily' },
  { name: 'No caffeine after 2pm', icon: '\u{2615}', color: 'peach', frequency: 'Daily' },
  { name: 'No screens before bed', icon: '\u{1F4BB}', color: 'lavender', frequency: 'Daily' },
  { name: 'Stop skipping breakfast', icon: '\u{1F95E}', color: 'mint', frequency: 'Daily' },
];
