import { FieldRequirement } from '@/components/FieldRequirement';

type GoalFieldsProps = {
  title: string;
  notes: string;
  progress: number;
  target: number;
  autoFocus?: boolean;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onProgressChange: (value: number) => void;
  onTargetChange: (value: number) => void;
};

export function GoalFields({
  title,
  notes,
  progress,
  target,
  autoFocus = false,
  onTitleChange,
  onNotesChange,
  onProgressChange,
  onTargetChange,
}: GoalFieldsProps) {
  return (
    <div className="goal-fields">
      <label className="edit-field">
        <FieldRequirement label="Title" required />
        <input
          className="quick-input"
          required
          aria-required="true"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="e.g. Launch my portfolio"
          autoFocus={autoFocus}
        />
      </label>
      <label className="edit-field">
        <FieldRequirement label="Notes" />
        <textarea
          className="quick-input goal-notes-input"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Why it matters, or the next step"
          rows={2}
        />
      </label>
      <div className="edit-reminder-row">
        <label className="edit-field">
          <FieldRequirement label="Progress" />
          <input
            className="quick-input"
            type="number"
            min={0}
            max={9999}
            value={progress}
            onChange={(event) => onProgressChange(Number(event.target.value))}
          />
        </label>
        <label className="edit-field">
          <FieldRequirement label="Target" />
          <input
            className="quick-input"
            type="number"
            min={1}
            max={9999}
            value={target}
            onChange={(event) => onTargetChange(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
