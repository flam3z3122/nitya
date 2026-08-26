import { Inbox } from 'lucide-react';

type EmptyStateProps = { title: string; message: string };
export function EmptyState({ title, message }: EmptyStateProps) { return <div className="empty-state"><div className="empty-icon"><Inbox size={21} /></div><h3>{title}</h3><p>{message}</p></div>; }
