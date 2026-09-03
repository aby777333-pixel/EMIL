/** Backend status values from the support_tickets table. */
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

/** Spec-aligned status taxonomy (what the user sees). The backend mapping
 *  collapses internal review states down to five public buckets. */
export type DisplayStatus = 'open' | 'awaiting_you' | 'awaiting_us' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type TicketCategory =
  | 'general'
  | 'deposit'
  | 'withdrawal'
  | 'trading'
  | 'kyc'
  | 'technical'
  | 'billing'
  | 'account'
  | 'other';

export const CATEGORY_OPTIONS: { id: TicketCategory; label: string }[] = [
  { id: 'general',    label: 'General' },
  { id: 'account',    label: 'Account' },
  { id: 'deposit',    label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'trading',    label: 'Trading' },
  { id: 'kyc',        label: 'KYC / Verification' },
  { id: 'technical',  label: 'Technical' },
  { id: 'billing',    label: 'Billing' },
  { id: 'other',      label: 'Other' },
];

export const PRIORITY_OPTIONS: { id: TicketPriority; label: string }[] = [
  { id: 'low',    label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high',   label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

/**
 * Translate the backend status into the customer-facing five-bucket
 * taxonomy from the spec. Whose-court-is-it logic lives here so every
 * surface (list, detail, drawer) shows the same value.
 */
export function displayStatus(
  backend: TicketStatus,
  lastSenderRole: 'client' | 'agent' | 'system' | null,
): DisplayStatus {
  if (backend === 'resolved') return 'resolved';
  if (backend === 'closed') return 'closed';
  if (backend === 'waiting') return 'awaiting_you';
  if (lastSenderRole === 'agent') return 'awaiting_you';
  if (lastSenderRole === 'client') return 'awaiting_us';
  return 'open';
}
