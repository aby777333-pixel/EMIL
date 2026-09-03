export interface PAMMFund {
  id: string;
  name: string;
  manager: string;
  managerAvatar: string;
  ytdReturn: number;
  maxDrawdown: number;
  sharpe: number;
  navPerShare: number;
  totalAUM: number;
  investors: number;
  performanceFee: number;
  managementFee: number;
  minInvestment: number;
  lockupDays: number;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  description: string;
  equityCurve: number[];
  inceptionDate: string;
}

export interface PAMMInvestment {
  id: string;
  fundId: string;
  fundName: string;
  shares: number;
  currentValue: number;
  investedAmount: number;
  pnl: number;
  investedAt: string;
}

export const mockFunds: PAMMFund[] = [
  {
    id: 'pamm-1',
    name: 'Nexus Alpha Fund',
    manager: 'Michael Chen',
    managerAvatar: 'MC',
    ytdReturn: 32.5,
    maxDrawdown: -8.2,
    sharpe: 2.1,
    navPerShare: 1.325,
    totalAUM: 2400000,
    investors: 47,
    performanceFee: 20,
    managementFee: 2,
    minInvestment: 1000,
    lockupDays: 30,
    riskLevel: 'Moderate',
    description: 'Diversified forex strategy across major and cross pairs with dynamic hedging',
    equityCurve: [1.0, 1.02, 1.05, 1.04, 1.08, 1.12, 1.10, 1.15, 1.18, 1.22, 1.20, 1.25, 1.28, 1.30, 1.32, 1.325],
    inceptionDate: '2024-03-15',
  },
  {
    id: 'pamm-2',
    name: 'Digital Asset Growth',
    manager: 'Sarah Kim',
    managerAvatar: 'SK',
    ytdReturn: 68.4,
    maxDrawdown: -25.8,
    sharpe: 1.45,
    navPerShare: 1.684,
    totalAUM: 5800000,
    investors: 128,
    performanceFee: 25,
    managementFee: 2.5,
    minInvestment: 5000,
    lockupDays: 60,
    riskLevel: 'Aggressive',
    description: 'Crypto-focused fund trading BTC, ETH and top-20 altcoins with momentum strategies',
    equityCurve: [1.0, 0.95, 1.05, 1.12, 1.08, 1.22, 1.30, 1.18, 1.35, 1.42, 1.38, 1.52, 1.58, 1.62, 1.68, 1.684],
    inceptionDate: '2024-01-10',
  },
  {
    id: 'pamm-3',
    name: 'Precious Metals Fund',
    manager: 'David Rothschild',
    managerAvatar: 'DR',
    ytdReturn: 18.2,
    maxDrawdown: -5.4,
    sharpe: 2.65,
    navPerShare: 1.182,
    totalAUM: 1200000,
    investors: 32,
    performanceFee: 15,
    managementFee: 1.5,
    minInvestment: 500,
    lockupDays: 14,
    riskLevel: 'Conservative',
    description: 'Conservative gold and silver trading with strict risk management and hedging',
    equityCurve: [1.0, 1.01, 1.03, 1.04, 1.05, 1.07, 1.08, 1.09, 1.10, 1.12, 1.13, 1.15, 1.16, 1.17, 1.18, 1.182],
    inceptionDate: '2024-06-01',
  },
  {
    id: 'pamm-4',
    name: 'Global Macro Strategy',
    manager: 'James Wong',
    managerAvatar: 'JW',
    ytdReturn: 41.8,
    maxDrawdown: -14.2,
    sharpe: 1.88,
    navPerShare: 1.418,
    totalAUM: 8500000,
    investors: 215,
    performanceFee: 20,
    managementFee: 2,
    minInvestment: 2500,
    lockupDays: 30,
    riskLevel: 'Moderate',
    description: 'Multi-asset macro strategy trading FX, indices, commodities based on economic data',
    equityCurve: [1.0, 0.98, 1.04, 1.08, 1.05, 1.12, 1.18, 1.15, 1.22, 1.28, 1.25, 1.32, 1.35, 1.38, 1.40, 1.418],
    inceptionDate: '2023-11-20',
  },
  {
    id: 'pamm-5',
    name: 'Volatility Edge',
    manager: 'Andrei Volkov',
    managerAvatar: 'AV',
    ytdReturn: 55.2,
    maxDrawdown: -18.7,
    sharpe: 1.62,
    navPerShare: 1.552,
    totalAUM: 3200000,
    investors: 76,
    performanceFee: 25,
    managementFee: 2,
    minInvestment: 2000,
    lockupDays: 45,
    riskLevel: 'Aggressive',
    description: 'Volatility arbitrage and mean-reversion strategies across FX and index options',
    equityCurve: [1.0, 0.96, 1.05, 1.10, 1.02, 1.15, 1.22, 1.18, 1.30, 1.35, 1.28, 1.42, 1.48, 1.45, 1.52, 1.552],
    inceptionDate: '2024-02-05',
  },
  {
    id: 'pamm-6',
    name: 'Steady Income Fund',
    manager: 'Elena Vasquez',
    managerAvatar: 'EV',
    ytdReturn: 12.8,
    maxDrawdown: -3.2,
    sharpe: 3.15,
    navPerShare: 1.128,
    totalAUM: 950000,
    investors: 24,
    performanceFee: 10,
    managementFee: 1,
    minInvestment: 250,
    lockupDays: 7,
    riskLevel: 'Conservative',
    description: 'Low-risk carry trade strategy focusing on interest rate differentials',
    equityCurve: [1.0, 1.01, 1.02, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.10, 1.11, 1.12, 1.12, 1.128],
    inceptionDate: '2024-08-12',
  },
];

export const mockInvestments: PAMMInvestment[] = [
  {
    id: 'inv-1',
    fundId: 'pamm-1',
    fundName: 'Nexus Alpha Fund',
    shares: 75.47,
    currentValue: 10000.0,
    investedAmount: 8500.0,
    pnl: 1500.0,
    investedAt: '2025-09-15',
  },
  {
    id: 'inv-2',
    fundId: 'pamm-4',
    fundName: 'Global Macro Strategy',
    shares: 35.26,
    currentValue: 5000.0,
    investedAmount: 4200.0,
    pnl: 800.0,
    investedAt: '2025-10-20',
  },
  {
    id: 'inv-3',
    fundId: 'pamm-6',
    fundName: 'Steady Income Fund',
    shares: 88.65,
    currentValue: 2800.0,
    investedAmount: 2500.0,
    pnl: 300.0,
    investedAt: '2026-01-05',
  },
];
