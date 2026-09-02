import {
  LayoutDashboard, ShieldCheck, CandlestickChart, Network, Gauge,
  Landmark, FlaskConical, GraduationCap, BrainCircuit, Settings, Plug,
  Microscope, Globe2, Newspaper, GitCompareArrows, BellRing,
} from 'lucide-react'

// Customer-facing navigation only. The backend command center lives at
// /command with its own shell — admins reach it via the shell's admin link.
export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/markets', label: 'Global Markets', icon: Globe2 },
  { href: '/charts', label: 'Charts', icon: CandlestickChart },
  { href: '/correlation', label: 'Correlation', icon: GitCompareArrows },
  { href: '/news', label: 'EMIL News', icon: Newspaper },
  { href: '/alerts', label: 'Alert Center', icon: BellRing },
  { href: '/arm', label: 'ARM / DISARM', icon: ShieldCheck },
  { href: '/trades', label: 'Trade Cards', icon: CandlestickChart },
  { href: '/agents', label: 'Agent Council', icon: Network },
  { href: '/api-hub', label: 'Global API Hub', icon: Plug },
  { href: '/risk', label: 'Risk Management', icon: Gauge },
  { href: '/capital', label: 'Capital & Performance', icon: Landmark },
  { href: '/strategies', label: 'Strategy Center', icon: FlaskConical },
  { href: '/lab', label: 'Strategy Lab', icon: Microscope },
  { href: '/teach', label: 'Teach EMIL', icon: GraduationCap },
  { href: '/trust', label: 'Trust & Metacognition', icon: BrainCircuit },
  { href: '/settings', label: 'Settings & Permissions', icon: Settings },
]
