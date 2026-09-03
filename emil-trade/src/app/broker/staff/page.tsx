'use client';

import { useState } from 'react';
import { StaffManager } from '@/components/broker/StaffManager';
import type { StaffMember, StaffRole, AdminAction, StaffPermission } from '@/types/broker';

const MOCK_ROLES: StaffRole[] = [
  { id: 'r1', name: 'Broker Admin', description: 'Full access to broker tenancy', permissions: ['dashboard.view', 'clients.view', 'clients.edit', 'trading.view', 'trading.execute', 'risk.view', 'risk.edit', 'finance.view', 'finance.approve_withdrawal', 'compliance.view', 'compliance.edit', 'settings.view', 'settings.edit', 'reports.view', 'reports.create', 'staff.view', 'staff.edit'] as StaffPermission[], isSystem: true, staffCount: 2 },
  { id: 'r2', name: 'Compliance Officer', description: 'KYC/AML review and compliance operations', permissions: ['dashboard.view', 'clients.view', 'compliance.view', 'compliance.edit', 'compliance.kyc_review', 'reports.view'] as StaffPermission[], isSystem: true, staffCount: 3 },
  { id: 'r3', name: 'Risk Manager', description: 'Risk exposure and A/B book management', permissions: ['dashboard.view', 'risk.view', 'risk.edit', 'risk.ab_routing', 'trading.view', 'reports.view'] as StaffPermission[], isSystem: true, staffCount: 2 },
  { id: 'r4', name: 'Finance Officer', description: 'Payments, withdrawals, and revenue', permissions: ['dashboard.view', 'finance.view', 'finance.approve_withdrawal', 'ib.view', 'reports.view', 'reports.create'] as StaffPermission[], isSystem: true, staffCount: 2 },
  { id: 'r5', name: 'Sales Agent', description: 'CRM pipeline and assigned clients', permissions: ['dashboard.view', 'clients.view', 'clients.edit', 'support.view', 'support.respond'] as StaffPermission[], isSystem: false, staffCount: 5 },
  { id: 'r6', name: 'Support Agent', description: 'Client support with read-only account access', permissions: ['dashboard.view', 'clients.view', 'support.view', 'support.respond'] as StaffPermission[], isSystem: false, staffCount: 4 },
];

const MOCK_STAFF: StaffMember[] = [
  { id: 's1', userId: 'u1', name: 'Admin User', email: 'admin@brokerage.com', role: MOCK_ROLES[0], lastLogin: new Date().toISOString(), actionsToday: 45, isOnline: true, assignedAt: '2024-01-15' },
  { id: 's2', userId: 'u2', name: 'Jane Compliance', email: 'jane@brokerage.com', role: MOCK_ROLES[1], lastLogin: new Date(Date.now() - 3600000).toISOString(), actionsToday: 23, isOnline: true, assignedAt: '2024-03-01' },
  { id: 's3', userId: 'u3', name: 'Tom Risk', email: 'tom@brokerage.com', role: MOCK_ROLES[2], lastLogin: new Date(Date.now() - 7200000).toISOString(), actionsToday: 12, isOnline: false, assignedAt: '2024-02-10' },
  { id: 's4', userId: 'u4', name: 'Mike Sales', email: 'mike@brokerage.com', role: MOCK_ROLES[4], lastLogin: new Date(Date.now() - 1800000).toISOString(), actionsToday: 67, isOnline: true, assignedAt: '2024-06-01' },
  { id: 's5', userId: 'u5', name: 'Lisa Support', email: 'lisa@brokerage.com', role: MOCK_ROLES[5], lastLogin: new Date(Date.now() - 900000).toISOString(), actionsToday: 34, isOnline: true, assignedAt: '2024-07-15' },
];

const MOCK_ACTIONS: AdminAction[] = [
  { id: 'a1', userId: 'u1', userName: 'Admin User', action: 'approved_withdrawal', entityType: 'transaction', entityId: 'txn-abc123', details: { amount: 5000, currency: 'USD' }, ipAddress: '192.168.1.1', createdAt: new Date().toISOString() },
  { id: 'a2', userId: 'u2', userName: 'Jane Compliance', action: 'approved_kyc', entityType: 'user', entityId: 'usr-def456', details: { level: 2 }, ipAddress: '192.168.1.2', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'a3', userId: 'u3', userName: 'Tom Risk', action: 'changed_routing', entityType: 'routing_rule', entityId: 'rule-ghi789', details: { from: 'b_book', to: 'a_book' }, ipAddress: '192.168.1.3', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a4', userId: 'u4', userName: 'Mike Sales', action: 'moved_stage', entityType: 'crm_lead', entityId: 'lead-jkl012', details: { from: 'contacted', to: 'demo' }, ipAddress: '192.168.1.4', createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: 'a5', userId: 'u1', userName: 'Admin User', action: 'force_closed_position', entityType: 'position', entityId: 'pos-mno345', details: { symbol: 'BTCUSD', volume: 5.2, reason: 'margin_call' }, ipAddress: '192.168.1.1', createdAt: new Date(Date.now() - 7200000).toISOString() },
];

export default function StaffPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Staff & Role Management</h1>
        <p className="text-xs text-white/30">Manage staff roles, permissions, and audit trail</p>
      </div>
      <StaffManager
        staff={MOCK_STAFF}
        roles={MOCK_ROLES}
        recentActions={MOCK_ACTIONS}
        onEditRole={(id) => console.log('Edit role:', id)}
      />
    </div>
  );
}
