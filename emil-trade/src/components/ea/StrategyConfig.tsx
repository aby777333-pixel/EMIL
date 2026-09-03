'use client';

import { useState } from 'react';
import { Play, Zap, ChevronDown, Settings2 } from 'lucide-react';

const SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD',
  'NZDUSD', 'USDCHF', 'EURGBP', 'EURJPY', 'GBPJPY',
  'XAUUSD', 'XAGUSD', 'US30', 'NAS100', 'SPX500',
];

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1H', value: '1H' },
  { label: '4H', value: '4H' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
];

interface StrategyConfigProps {
  strategyName: string;
  onStrategyNameChange: (name: string) => void;
  onRunBacktest: () => void;
  isRunning: boolean;
}

export default function StrategyConfig({
  strategyName,
  onStrategyNameChange,
  onRunBacktest,
  isRunning,
}: StrategyConfigProps) {
  const [symbol, setSymbol] = useState('EURUSD');
  const [timeframe, setTimeframe] = useState('1H');
  const [fastPeriod, setFastPeriod] = useState(9);
  const [slowPeriod, setSlowPeriod] = useState(21);
  const [lotSize, setLotSize] = useState(0.1);
  const [stopLoss, setStopLoss] = useState(20);
  const [takeProfit, setTakeProfit] = useState(40);
  const [backtestDays, setBacktestDays] = useState(90);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ backgroundColor: '#111118' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#1E1E2E' }}
      >
        <Settings2 size={14} style={{ color: '#0091D5' }} />
        <span className="text-[12px] font-semibold" style={{ color: '#E0E0E0' }}>
          Strategy Configuration
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Strategy Name */}
        <FieldGroup label="Strategy Name">
          <input
            type="text"
            value={strategyName}
            onChange={(e) => onStrategyNameChange(e.target.value)}
            className="w-full px-3 py-1.5 rounded text-[12px] font-mono outline-none focus:ring-1 focus:ring-[#0091D5]"
            style={{
              backgroundColor: '#0D0D14',
              border: '1px solid #1E1E2E',
              color: '#E0E0E0',
            }}
          />
        </FieldGroup>

        {/* Symbol */}
        <FieldGroup label="Symbol">
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-1.5 rounded text-[12px] font-mono outline-none appearance-none cursor-pointer"
              style={{
                backgroundColor: '#0D0D14',
                border: '1px solid #1E1E2E',
                color: '#E0E0E0',
              }}
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"
            />
          </div>
        </FieldGroup>

        {/* Timeframe */}
        <FieldGroup label="Timeframe">
          <div className="grid grid-cols-4 gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className="px-2 py-1 rounded text-[11px] font-mono transition-all"
                style={{
                  backgroundColor:
                    timeframe === tf.value ? '#0091D5' : '#0D0D14',
                  color: timeframe === tf.value ? '#000' : '#888',
                  border: `1px solid ${timeframe === tf.value ? '#0091D5' : '#1E1E2E'}`,
                  fontWeight: timeframe === tf.value ? 700 : 400,
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </FieldGroup>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#1E1E2E' }} />

        {/* Parameters Section */}
        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider mb-2 block"
            style={{ color: '#666' }}
          >
            Strategy Parameters
          </span>

          <div className="flex flex-col gap-2.5">
            <ParamInput
              label="Fast EMA Period"
              value={fastPeriod}
              onChange={setFastPeriod}
              min={2}
              max={200}
            />
            <ParamInput
              label="Slow EMA Period"
              value={slowPeriod}
              onChange={setSlowPeriod}
              min={5}
              max={500}
            />
            <ParamInput
              label="Lot Size"
              value={lotSize}
              onChange={setLotSize}
              min={0.01}
              max={100}
              step={0.01}
            />
            <ParamInput
              label="Stop Loss (pips)"
              value={stopLoss}
              onChange={setStopLoss}
              min={1}
              max={500}
            />
            <ParamInput
              label="Take Profit (pips)"
              value={takeProfit}
              onChange={setTakeProfit}
              min={1}
              max={1000}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: '#1E1E2E' }} />

        {/* Backtest Period */}
        <FieldGroup label="Backtest Period (days)">
          <input
            type="number"
            value={backtestDays}
            onChange={(e) => setBacktestDays(Number(e.target.value))}
            min={7}
            max={365}
            className="w-full px-3 py-1.5 rounded text-[12px] font-mono outline-none"
            style={{
              backgroundColor: '#0D0D14',
              border: '1px solid #1E1E2E',
              color: '#E0E0E0',
            }}
          />
        </FieldGroup>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={onRunBacktest}
            disabled={isRunning}
            className="flex items-center justify-center gap-2 w-full py-2 rounded text-[12px] font-semibold transition-all"
            style={{
              backgroundColor: isRunning ? '#1A5A72' : '#0091D5',
              color: isRunning ? '#888' : '#000',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? (
              <>
                <div
                  className="w-3 h-3 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: '#666',
                    borderTopColor: '#0091D5',
                  }}
                />
                Running Backtest...
              </>
            ) : (
              <>
                <Play size={13} />
                Run Backtest
              </>
            )}
          </button>

          <button
            className="flex items-center justify-center gap-2 w-full py-2 rounded text-[12px] font-semibold transition-all hover:opacity-80"
            style={{
              backgroundColor: '#1E1E2E',
              color: '#888',
              border: '1px solid #2A2A3A',
            }}
          >
            <Zap size={13} />
            Optimize Parameters
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[11px] mb-1 font-medium"
        style={{ color: '#888' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ParamInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px]" style={{ color: '#888' }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-20 px-2 py-1 rounded text-[12px] font-mono text-right outline-none"
        style={{
          backgroundColor: '#0D0D14',
          border: '1px solid #1E1E2E',
          color: '#E0E0E0',
        }}
      />
    </div>
  );
}
