'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Shield, Clock, Eye, Plus, Edit3,
  CheckCircle2, XCircle, Activity,
} from 'lucide-react';
import type { StaffMember, StaffRole, AdminAction } from '@/types/broker';

interface StaffManagerProps {
  staff: StaffMember[];
  roles: StaffRole[];
  recentActions: AdminAction[];
  onEditRole: (roleId: string) => void;
}

export function StaffManager({ staff, roles, recentActions, onEditRole }: StaffManagerProps) {
  const [tab, setTab] = useState<'staff' | 'roles' | 'audit'>('staff');

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {([
          { key: 'staff', label: 'Staff Members', icon: <Users className="h-3.5 w-3.5" /> },
          { key: 'roles', label: 'Roles & Permissions', icon: <Shield className="h-3.5 w-3.5" /> },
          { key: 'audit', label: 'Audit Log', icon: <Activity className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Staff List */}
      {tab === 'staff' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left px-5 py-2.5 font-medium">Staff Member</th>
                <th className="text-left px-3 py-2.5 font-medium">Role</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-right px-3 py-2.5 font-medium">Actions Today</th>
                <th className="text-left px-3 py-2.5 font-medium">Last Login</th>
                <th className="px-5 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/50">
                          {member.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1117] ${
                          member.isOnline ? 'bg-[#00dc82]' : 'bg-white/20'
                        }`} />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white">{member.name}</div>
                        <div className="text-[10px] text-white/30">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#00b4ff]/10 text-[#00b4ff]">
                      {member.role.name}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] ${member.isOnline ? 'text-[#00dc82]' : 'text-white/25'}`}>
                      {member.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-white/40">
                    {member.actionsToday}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/30">
                    {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <button className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Roles */}
      {tab === 'roles' && (
        <div className="grid grid-cols-2 gap-4">
          {roles.map(role => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-semibold text-white">{role.name}</h4>
                  <p className="text-[10px] text-white/30">{role.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/25">{role.staffCount} staff</span>
                  {!role.isSystem && (
                    <button
                      onClick={() => onEditRole(role.id)}
                      className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/60"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {role.permissions.slice(0, 8).map(p => (
                  <span key={p} className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-white/25">
                    {p}
                  </span>
                ))}
                {role.permissions.length > 8 && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] bg-white/5 text-white/20">
                    +{role.permissions.length - 8} more
                  </span>
                )}
              </div>
              {role.isSystem && (
                <div className="mt-2 text-[9px] text-white/15 flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5" /> System role — cannot be modified
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
            {recentActions.map(action => (
              <div key={action.id} className="px-5 py-2.5 flex items-center gap-3 text-xs hover:bg-white/[0.02]">
                <Clock className="h-3 w-3 text-white/15 shrink-0" />
                <span className="text-white/50 font-medium">{action.userName}</span>
                <span className="text-white/30">{action.action}</span>
                <span className="text-white/20">{action.entityType}</span>
                {action.entityId && <span className="font-mono text-[10px] text-white/15">{action.entityId.slice(0, 8)}</span>}
                <span className="ml-auto text-[10px] text-white/15">
                  {new Date(action.createdAt).toLocaleString()}
                </span>
                <span className="text-[10px] text-white/10">{action.ipAddress}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
