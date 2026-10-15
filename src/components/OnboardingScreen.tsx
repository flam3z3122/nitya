import { useState } from 'react';
import { ArrowRight, Check, Dumbbell, Droplet, Flame, Moon, Sparkles, Sprout, Target, User } from 'lucide-react';
import { goodHabitSuggestions } from '@/data/habitSuggestions';
import { FieldRequirement } from '@/components/FieldRequirement';

type OnboardingScreenProps = {
  onComplete: (name: string, selectedHabits: { name: string; icon: string; color: string; frequency: string }[]) => Promise<void>;
  loading: boolean;
  error: string | null;
};

type ExampleHabit = { name: string; icon: string; color: string; frequency: string; lucideIcon: typeof Flame };

const lucideMap: Record<string, typeof Flame> = {
  '\u{1F4A7}': Droplet,
  '\u{1F3CB}\u{FE0F}': Dumbbell,
  '\u{1F4D6}': Sprout,
  '\u{1F4A4}': Moon,
  '\u{1F9D8}': Sparkles,
  '\u{1F6B6}': Target,
};

const exampleHabits: ExampleHabit[] = goodHabitSuggestions.slice(0, 6).map((h) => ({
  ...h,
  lucideIcon: lucideMap[h.icon] ?? Flame,
}));

const tips = [
  { title: 'Start small', text: 'Choose habits that feel manageable. You can always add more later.' },
  { title: 'Be consistent', text: 'Try to do your habits at the same time each day for the best results.' },
  { title: 'Track your streak', text: 'Check in daily to keep your streak alive and build momentum.' },
];

export function OnboardingScreen({ onComplete, loading, error }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleHabit = (habitName: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(habitName)) next.delete(habitName);
      else next.add(habitName);
      return next;
    });
  };

  const finish = () => {
    const chosen = exampleHabits.filter((h) => selected.has(h.name));
    void onComplete(name.trim() || 'there', chosen);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card onboarding-card">
        <div className="auth-brand">
          <div className="auth-brand-mark has-logo"><img className="logo-light" src="/icons/nitya-mark-light.png" alt="Nitya" draggable={false} /><img className="logo-dark" src="/icons/nitya-mark-dark.png" alt="" aria-hidden="true" draggable={false} /></div>
          <span>Nitya</span>
        </div>

        <div className="onboarding-progress">
          {[0, 1, 2].map((i) => <div key={i} className={`onboarding-dot ${i <= step ? 'active' : ''}`} />)}
        </div>

        {step === 0 && (
          <div className="onboarding-step">
            <div className="onboarding-hero">
              <div className="onboarding-icon-large"><User size={32} /></div>
              <h1>Let&apos;s get to know you</h1>
              <p>What should we call you? Your name will appear across your workspace and profile.</p>
            </div>
            <div className="onboarding-name-field">
              <FieldRequirement label="Your name" required />
              <input
                className="onboarding-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                required
                aria-required="true"
                maxLength={40}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setStep(1); }}
              />
            </div>
            {error && <p className="quick-error">{error}</p>}
            <button className="auth-submit" disabled={!name.trim() || loading} onClick={() => setStep(1)}>
              Continue <ArrowRight size={17} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-hero">
              <div className="onboarding-icon-large"><Flame size={32} /></div>
              <h1>Build your habits</h1>
              <p>Pick habits to start with. You can change them anytime.</p>
            </div>
            <div className="onboarding-habit-grid">
              {exampleHabits.map((habit) => {
                const Icon = habit.lucideIcon;
                const isSelected = selected.has(habit.name);
                return (
                  <button
                    key={habit.name}
                    className={`onboarding-habit-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleHabit(habit.name)}
                    type="button"
                  >
                    <span className={`onboarding-habit-icon habit-${habit.color}`}><Icon size={18} /></span>
                    <span>{habit.name}</span>
                    {isSelected && <Check size={16} className="onboarding-habit-check" />}
                  </button>
                );
              })}
            </div>
            {error && <p className="quick-error">{error}</p>}
            <div className="onboarding-nav">
              <button className="onboarding-back" onClick={() => setStep(0)}><ArrowRight size={15} className="rotate-180" /> Back</button>
              <button className="auth-submit" disabled={loading} onClick={() => setStep(2)}>
              <span className="button-text">{selected.size > 0 ? `Continue with ${selected.size} habit${selected.size > 1 ? 's' : ''}` : 'Skip for now'}</span>
              <ArrowRight size={17} />
            </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-hero">
              <div className="onboarding-icon-large"><Sparkles size={32} /></div>
              <h1>Tips to build momentum</h1>
              <p>A few quick tips to help you get the most out of Nitya.</p>
            </div>
            <div className="onboarding-tips">
              {tips.map((tip) => (
                <div key={tip.title} className="onboarding-tip">
                  <div className="onboarding-tip-icon"><Check size={16} /></div>
                  <div>
                    <strong>{tip.title}</strong>
                    <p>{tip.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="quick-error">{error}</p>}
            <div className="onboarding-nav">
              <button className="onboarding-back" onClick={() => setStep(1)}><ArrowRight size={15} className="rotate-180" /> Back</button>
              <button className="auth-submit" disabled={loading} onClick={finish}>
                <span className="button-text">{loading ? 'Setting up\u2026' : 'Start building habits'}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
