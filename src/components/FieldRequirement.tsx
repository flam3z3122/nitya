type FieldRequirementProps = {
  label: string;
  required?: boolean;
};

export function FieldRequirement({ label, required = false }: FieldRequirementProps) {
  return (
    <div className="field-label-row">
      <span className="field-label-text">{label}</span>
      {required
        ? <span className="field-required" aria-label="required">*</span>
        : <span className="field-optional">Optional</span>}
    </div>
  );
}
