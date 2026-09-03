'use client';

import { useMemo } from 'react';
import { useDealingDeskStore } from '@/stores/dealer';

// ================================================================
// CounterpartyWatch -- compact section showing top 5 clients by
// open risk. Sits below the exposure heatmap in the right panel.
// ================================================================

interface ClientRow {
  account: string;
  symbol: string;
  pnl: number;
  tag: string;
  tagIcon: string;
  tagColor: string;
}

const CLIENT_TAGS: Record<string, { tag: string; icon: string; color: string }> = {
  'ACC-10078': { tag: 'Toxic', icon: '\u26A0', color: '#FFB300' },
  'ACC-10200': { tag: 'HFT', icon: '\u26A1', color: '#00B4D8' },
};

export default function CounterpartyWatch() {
  const openPositions = useDealingDeskStore((s) => s.openPositions);

  const { rows, totalClientPnl } = useMemo(() => {
    // Group by account, pick the largest abs PnL position per account
    const byAccount = new Map<string, { symbol: string; pnl: number }>();
    for (const pos of openPositions) {
      const existing = byAccount.get(pos.account_id);
      if (!existing || Math.abs(pos.floating_pnl) > Math.abs(existing.pnl)) {
        byAccount.set(pos.account_id, { symbol: pos.symbol, pnl: pos.floating_pnl });
      }
    }

    // Build rows, sorted by abs PnL descending
    const allRows: ClientRow[] = Array.from(byAccount.entries())
      .sort((a, b) => Math.abs(b[1].pnl) - Math.abs(a[1].pnl))
      .slice(0, 5)
      .map(([account, data]) => {
        const info = CLIENT_TAGS[account] || { tag: 'Normal', icon: '', color: '#888899' };
        return {
          account,
          symbol: data.symbol,
          pnl: data.pnl,
          tag: info.tag,
          tagIcon: info.icon,
          tagColor: info.color,
        };
      });

    // Fallback mock data if positions don't have enough spread
    const fallbackRows: ClientRow[] = [
      { account: 'ACC-10042', symbol: 'EURUSD', pnl: 191.70, tag: 'Normal', tagIcon: '', tagColor: '#888899' },
      { account: 'ACC-10078', symbol: 'GBPUSD', pnl: -310.00, tag: 'Toxic', tagIcon: '\u26A0', tagColor: '#FFB300' },
      { account: 'ACC-10115', symbol: 'XAUUSD', pnl: 580.00, tag: 'Normal', tagIcon: '', tagColor: '#888899' },
      { account: 'ACC-10042', symbol: 'USDJPY', pnl: -215.30, tag: 'Normal', tagIcon: '', tagColor: '#888899' },
      { account: 'ACC-10200', symbol: 'BTCUSD', pnl: 42.50, tag: 'HFT', tagIcon: '\u26A1', tagColor: '#00B4D8' },
    ];

    const finalRows = allRows.length >= 3 ? allRows : fallbackRows;
    const total = finalRows.reduce((s, r) => s + r.pnl, 0);
    return { rows: finalRows, totalClientPnl: total };
  }, [openPositions]);

  const brokerBBook = -totalClientPnl;

  return (
    <div
      style={{
        height: 150,
        background: '#0D0D12',
        borderTop: '1px solid #252530',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: 11,
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: '#555566',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        COUNTERPARTY WATCH
      </div>

      {/* Client rows */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {rows.map((row, i) => (
          <div
            key={`${row.account}-${row.symbol}-${i}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 18,
              color: '#888899',
            }}
          >
            <span style={{ width: 76, color: '#F2F2F2', fontSize: 10 }}>{row.account}</span>
            <span style={{ width: 52, fontSize: 10 }}>{row.symbol}</span>
            <span
              style={{
                width: 62,
                textAlign: 'right',
                color: row.pnl >= 0 ? '#00C853' : '#E50914',
                fontSize: 10,
              }}
            >
              {row.pnl >= 0 ? '+' : ''}${row.pnl.toFixed(2)}
            </span>
            <span
              style={{
                width: 56,
                textAlign: 'right',
                fontSize: 9,
                color: row.tagColor,
              }}
            >
              {row.tagIcon ? `${row.tagIcon} ` : ''}{row.tag}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #1A1A22',
          paddingTop: 4,
          marginTop: 2,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#555566',
        }}
      >
        <span>
          Total client PnL:{' '}
          <span style={{ color: totalClientPnl >= 0 ? '#00C853' : '#E50914' }}>
            {totalClientPnl >= 0 ? '+' : ''}${totalClientPnl.toFixed(0)}
          </span>
        </span>
        <span>
          Broker B-book:{' '}
          <span style={{ color: brokerBBook >= 0 ? '#00C853' : '#E50914' }}>
            {brokerBBook >= 0 ? '+' : ''}${brokerBBook.toFixed(0)}
          </span>
        </span>
      </div>
    </div>
  );
}
