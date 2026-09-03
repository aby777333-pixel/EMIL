import { Card, SectionTitle } from '../components/ui';
import { Users, Check } from 'lucide-react';

const ROLES = [
  'Super Admin', 'Raptor Admin', 'Risk Manager', 'Dealer', 'Compliance Officer',
  'Portfolio Manager', 'Research Analyst', 'Strategy Developer', 'Broker',
  'Introducing Broker', 'Institutional Client', 'Retail Client', 'Read-only Auditor',
];

const PERMS = [
  'Data', 'Research', 'Create', 'Code', 'Backtest', 'Approve', 'Deploy',
  'Live trade', 'Accounts', 'Risk limits', 'API keys', 'Audit log', 'Kill switch',
];

// permission matrix — which roles hold which permission (demo policy).
const GRANTS: Record<string, string[]> = {
  'Super Admin': PERMS,
  'Raptor Admin': ['Data', 'Research', 'Create', 'Code', 'Backtest', 'Approve', 'Deploy', 'Accounts', 'Risk limits', 'API keys', 'Audit log', 'Kill switch'],
  'Risk Manager': ['Data', 'Research', 'Backtest', 'Risk limits', 'Audit log', 'Kill switch'],
  'Dealer': ['Data', 'Live trade', 'Accounts', 'Kill switch'],
  'Compliance Officer': ['Data', 'Research', 'Approve', 'Audit log'],
  'Portfolio Manager': ['Data', 'Research', 'Create', 'Backtest', 'Approve', 'Deploy', 'Accounts'],
  'Research Analyst': ['Data', 'Research', 'Create', 'Backtest'],
  'Strategy Developer': ['Data', 'Research', 'Create', 'Code', 'Backtest'],
  'Broker': ['Data', 'Accounts', 'Audit log'],
  'Introducing Broker': ['Data', 'Accounts'],
  'Institutional Client': ['Data', 'Research', 'Create', 'Backtest', 'Approve', 'Deploy', 'Live trade', 'Kill switch'],
  'Retail Client': ['Data', 'Research', 'Create', 'Backtest', 'Approve', 'Live trade'],
  'Read-only Auditor': ['Data', 'Audit log'],
};

export default function Roles() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Roles &amp; Permissions</h2>
        <p className="text-sm text-subtext">
          Role-based access control. Permissions gate data, research, strategy creation, code editing,
          backtesting, approval, deployment, live trading, account and API-key management, the audit log
          and the kill switch.
        </p>
      </div>

      <Card>
        <SectionTitle right={<Users size={14} className="text-primary" />}>Permission Matrix</SectionTitle>
        <div className="overflow-x-auto">
          <table className="text-[11px] w-full">
            <thead>
              <tr className="text-subtext">
                <th className="text-left p-1.5 sticky left-0 bg-card">Role</th>
                {PERMS.map((p) => <th key={p} className="p-1.5 font-semibold whitespace-nowrap">{p}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const g = GRANTS[r] || [];
                return (
                  <tr key={r} className="border-t border-border/40">
                    <td className="p-1.5 font-semibold whitespace-nowrap sticky left-0 bg-card">{r}</td>
                    {PERMS.map((p) => (
                      <td key={p} className="p-1.5 text-center">
                        {g.includes(p)
                          ? <Check size={13} className="inline text-success" />
                          : <span className="text-subtext/30">·</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
