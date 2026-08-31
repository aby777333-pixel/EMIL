import {
  LayoutDashboard, ShieldCheck, CandlestickChart, Network, Gauge,
  Landmark, FlaskConical, GraduationCap, BrainCircuit, Settings, Plug,
} from 'lucide-react'

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/arm', label: 'ARM / DISARM', icon: ShieldCheck },
  { href: '/trades', label: 'Trade Cards', icon: CandlestickChart },
  { href: '/agents', label: 'Agent Council', icon: Network },
  { href: '/api-hub', label: 'India API Hub', icon: Plug },
  { href: '/risk', label: 'Risk Management', icon: Gauge },
  { href: '/capital', label: 'Capital & Performance', icon: Landmark },
  { href: '/strategies', label: 'Strategy Center', icon: FlaskConical },
  { href: '/teach', label: 'Teach EMIL', icon: GraduationCap },
  { href: '/trust', label: 'Trust & Metacognition', icon: BrainCircuit },
  { href: '/settings', label: 'Settings & Permissions', icon: Settings },
]
