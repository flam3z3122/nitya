import { Sparkles } from 'lucide-react';

export type SuggestionChipItem = {
  id: string;
  label: string;
  icon?: string;
};

type SuggestionChipsProps = {
  items: SuggestionChipItem[];
  previewCount?: number;
  expanded: boolean;
  onExpand: () => void;
  onSelect: (id: string) => void;
};

export function SuggestionChips({ items, previewCount = 3, expanded, onExpand, onSelect }: SuggestionChipsProps) {
  const visible = expanded ? items : items.slice(0, previewCount);

  return (
    <div className={`habit-suggestions compact${expanded ? ' is-expanded' : ''}`}>
      <p className="suggestion-label"><Sparkles size={12} /> Quick ideas</p>
      <div className="suggestion-chips">
        {visible.map((item) => (
          <button key={item.id} type="button" className="suggestion-chip" onClick={() => onSelect(item.id)}>
            {item.icon ? <span className="suggestion-chip-icon">{item.icon}</span> : null}
            {item.label}
          </button>
        ))}
        {!expanded && items.length > previewCount && (
          <button type="button" className="suggestion-chip suggestion-chip-more" onClick={onExpand}>
            + more
          </button>
        )}
      </div>
    </div>
  );
}
