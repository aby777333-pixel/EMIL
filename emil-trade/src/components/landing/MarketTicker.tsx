'use client';

import { motion } from 'framer-motion';

const pairs = [
  { symbol: 'EUR/USD', price: '1.0847', change: '+0.12%', up: true },
  { symbol: 'GBP/USD', price: '1.2634', change: '+0.08%', up: true },
  { symbol: 'USD/JPY', price: '151.42', change: '-0.15%', up: false },
  { symbol: 'XAU/USD', price: '2,341.50', change: '+0.45%', up: true },
  { symbol: 'BTC/USD', price: '67,842', change: '+1.23%', up: true },
  { symbol: 'US30', price: '39,872', change: '-0.06%', up: false },
  { symbol: 'NAS100', price: '18,234', change: '+0.34%', up: true },
  { symbol: 'EUR/GBP', price: '0.8585', change: '-0.04%', up: false },
  { symbol: 'AUD/USD', price: '0.6542', change: '+0.11%', up: true },
  { symbol: 'USD/CHF', price: '0.9012', change: '-0.09%', up: false },
  { symbol: 'XAG/USD', price: '27.45', change: '+0.67%', up: true },
  { symbol: 'ETH/USD', price: '3,456', change: '+2.14%', up: true },
];

export default function MarketTicker() {
  const doubled = [...pairs, ...pairs];
  return (
    <div className="overflow-hidden border-y border-white/[0.06] bg-[#0B1422]/60 backdrop-blur-sm">
      <motion.div
        className="flex gap-0 py-2.5"
        animate={{ x: [0, -50 * pairs.length] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-6 shrink-0 border-r border-white/[0.04]">
            <span className="text-xs font-semibold text-[#EAF0FA]">{p.symbol}</span>
            <span className="text-xs mono text-[#7A8BA8]">{p.price}</span>
            <span className={`text-[10px] mono font-semibold ${p.up ? 'text-[#00C896]' : 'text-[#FF4560]'}`}>
              {p.change}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
