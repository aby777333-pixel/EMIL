'use client';

import DashboardCard from '@/components/portal/dashboard/DashboardCard';

/**
 * 12-month return matrix shown on a manager's detail page. The current
 * month is highlighted (last cell). Months that haven't happened yet
 * for the live cycle render as `—`.
 */
export default function MonthlyReturnsTable({
  returns,
}: {
  returns: number[];
}) {
  const labels = monthLabelsLast12();
  return (
    <DashboardCard title="Monthly returns" padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--g-border-hair)' }}>
              {labels.map((l, i) => (
                <th
                  key={i}
                  className="num font-normal text-[10px] uppercase tracking-wider"
                  style={{
                    textAlign: 'center', padding: '10px 8px',
                    color: 'var(--g-text-muted)',
                  }}
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {returns.map((r, i) => {
                const pos = r >= 0;
                return (
                  <td
                    key={i}
                    className="num"
                    style={{
                      textAlign: 'center',
                      padding: '14px 8px',
                      color: pos ? 'var(--g-pnl-positive)' : 'var(--g-pnl-negative)',
                      background: i === returns.length - 1 ? 'rgba(220,38,38,0.04)' : 'transparent',
                    }}
                  >
                    {pos ? '+' : ''}{r.toFixed(1)}%
                  </td>
                );
              })}
              {Array.from({ length: 12 - returns.length }).map((_, i) => (
                <td
                  key={`empty-${i}`}
                  className="num"
                  style={{
                    textAlign: 'center', padding: '14px 8px',
                    color: 'var(--g-text-muted)',
                  }}
                >
                  —
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

/** Trailing 12 months in chronological order, ending with the current month. */
function monthLabelsLast12(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toLocaleString('en-US', { month: 'short' }));
  }
  return out;
}
