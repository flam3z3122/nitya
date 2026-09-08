import { Inbox } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Inbox size={21} /></div>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button type="button" className="button button-dark" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
