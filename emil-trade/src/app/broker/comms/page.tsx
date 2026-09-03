'use client';

import { useState } from 'react';
import { UnifiedInbox } from '@/components/crm/UnifiedInbox';
import type { UnifiedThread, ThreadMessage } from '@/types/crm';

const MOCK_THREADS: UnifiedThread[] = [
  { id: 't1', clientId: 'c1', clientName: 'James Wilson', channel: 'email', subject: 'Withdrawal inquiry', lastMessage: 'When will my withdrawal be processed? I submitted it 3 days ago.', lastMessageAt: new Date(Date.now() - 600000).toISOString(), unreadCount: 2, sentiment: 'negative', slaMinutesRemaining: 45, tags: ['billing'], assignedAgent: 'a1', isResolved: false },
  { id: 't2', clientId: 'c2', clientName: 'Sarah Chen', channel: 'whatsapp', subject: null, lastMessage: 'Thank you for the help with my verification!', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0, sentiment: 'positive', slaMinutesRemaining: null, tags: ['kyc'], assignedAgent: 'a1', isResolved: true },
  { id: 't3', clientId: 'c3', clientName: 'Ahmed Al-Rashid', channel: 'in_app_chat', subject: null, lastMessage: 'I want to upgrade to VIP account. What are the requirements?', lastMessageAt: new Date(Date.now() - 1800000).toISOString(), unreadCount: 1, sentiment: 'positive', slaMinutesRemaining: 120, tags: ['VIP', 'upgrade'], assignedAgent: null, isResolved: false },
  { id: 't4', clientId: 'c4', clientName: 'Maria Santos', channel: 'email', subject: 'Cannot login', lastMessage: 'I keep getting an error when trying to login from my phone', lastMessageAt: new Date(Date.now() - 7200000).toISOString(), unreadCount: 1, sentiment: 'negative', slaMinutesRemaining: 30, tags: ['technical'], assignedAgent: 'a2', isResolved: false },
  { id: 't5', clientId: 'c5', clientName: 'Dmitry Petrov', channel: 'telegram', subject: null, lastMessage: 'Can I get API access for my algo trading system?', lastMessageAt: new Date(Date.now() - 14400000).toISOString(), unreadCount: 0, sentiment: 'neutral', slaMinutesRemaining: null, tags: ['api', 'algo'], assignedAgent: 'a1', isResolved: false },
  { id: 't6', clientId: 'c6', clientName: 'Yuki Tanaka', channel: 'call', subject: 'Account review call', lastMessage: 'Scheduled monthly account review — discussed performance and strategy', lastMessageAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0, sentiment: 'positive', slaMinutesRemaining: null, tags: ['VIP', 'review'], assignedAgent: 'a3', isResolved: true },
];

const MOCK_MESSAGES: Record<string, ThreadMessage[]> = {
  t1: [
    { id: 'm1', direction: 'inbound', channel: 'email', senderName: 'James Wilson', body: 'Hi, I submitted a withdrawal request for $3,000 three days ago. The status still shows "pending". Can you check on this?', isInternal: false, attachments: [], sentimentScore: -0.6, createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'm2', direction: 'outbound', channel: 'email', senderName: 'Mike Support', body: 'Hi James, thank you for reaching out. Let me check the status of your withdrawal right away.', isInternal: false, attachments: [], sentimentScore: 0.5, createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'm3', direction: 'internal', channel: 'email', senderName: 'Mike Support', body: 'Checked with finance — withdrawal is stuck in compliance review due to source of funds flag. Need compliance team input.', isInternal: true, attachments: [], sentimentScore: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm4', direction: 'inbound', channel: 'email', senderName: 'James Wilson', body: 'When will my withdrawal be processed? I submitted it 3 days ago.', isInternal: false, attachments: [], sentimentScore: -0.7, createdAt: new Date(Date.now() - 600000).toISOString() },
  ],
  t3: [
    { id: 'm5', direction: 'inbound', channel: 'in_app_chat', senderName: 'Ahmed Al-Rashid', body: 'I want to upgrade to VIP account. What are the requirements?', isInternal: false, attachments: [], sentimentScore: 0.3, createdAt: new Date(Date.now() - 1800000).toISOString() },
  ],
};

export default function CommsPage() {
  const [selectedThread, setSelectedThread] = useState<UnifiedThread | null>(null);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Communication Hub</h1>
        <p className="text-xs text-white/30">Unified inbox — all channels in one view</p>
      </div>
      <UnifiedInbox
        threads={MOCK_THREADS}
        selectedThread={selectedThread}
        messages={selectedThread ? (MOCK_MESSAGES[selectedThread.id] ?? []) : []}
        onSelectThread={id => setSelectedThread(MOCK_THREADS.find(t => t.id === id) ?? null)}
        onSendMessage={(threadId, msg, internal) => console.log('Send', threadId, msg, internal)}
        onResolve={id => console.log('Resolve', id)}
      />
    </div>
  );
}
