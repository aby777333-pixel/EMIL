'use client';

import { useState } from 'react';

const codeExamples: Record<string, { label: string; code: string }> = {
  curl: {
    label: 'cURL',
    code: `# Place a market order
curl -X POST https://api.gio4x.com/v1/orders \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "EURUSD",
    "side": "buy",
    "type": "market",
    "quantity": 1.0,
    "comment": "API order"
  }'

# Response
{
  "id": "ord_8f3k2m9x",
  "symbol": "EURUSD",
  "side": "buy",
  "type": "market",
  "quantity": 1.0,
  "filled_price": 1.08542,
  "status": "filled",
  "created_at": "2026-03-28T14:22:01Z"
}`,
  },
  javascript: {
    label: 'JavaScript',
    code: `import Raptor from '@gio4x/raptor-sdk';

const client = new Raptor({
  apiKey: process.env.RAPTOR_API_KEY,
  environment: 'production',
});

// Place a market order
const order = await client.orders.create({
  symbol: 'EURUSD',
  side: 'buy',
  type: 'market',
  quantity: 1.0,
});

console.log(\`Order filled at \${order.filledPrice}\`);

// Stream real-time prices
const stream = client.streaming.subscribe(['EURUSD', 'GBPUSD']);

stream.on('tick', (tick) => {
  console.log(\`\${tick.symbol}: \${tick.bid}/\${tick.ask}\`);
});`,
  },
  python: {
    label: 'Python',
    code: `from gio4x import RaptorClient

client = RaptorClient(
    api_key="YOUR_API_KEY",
    environment="production"
)

# Place a market order
order = client.orders.create(
    symbol="EURUSD",
    side="buy",
    order_type="market",
    quantity=1.0
)

print(f"Order filled at {order.filled_price}")

# Get account summary
account = client.accounts.get_summary()
print(f"Balance: {account.balance}")
print(f"Equity: {account.equity}")
print(f"Open P&L: {account.unrealized_pnl}")`,
  },
};

export default function DeveloperClient() {
  const [lang, setLang] = useState<string>('curl');

  return (
    <div>
      {/* Language tabs */}
      <div className="flex gap-1 rounded-t-lg p-1" style={{ background: 'var(--bg-elevated)' }}>
        {Object.entries(codeExamples).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setLang(key)}
            className="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: lang === key ? 'var(--bg-surface)' : 'transparent',
              color: lang === key ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div
        className="overflow-x-auto rounded-b-lg p-6 font-mono text-sm leading-relaxed"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: 'none' }}
      >
        <pre style={{ color: 'var(--text-secondary)' }}>
          <code>{codeExamples[lang].code}</code>
        </pre>
      </div>
    </div>
  );
}
