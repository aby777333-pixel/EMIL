import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Workflow,
  Blocks,
  Lightbulb,
  PieChart,
  BarChart3,
  BookOpen,
  Briefcase,
  CandlestickChart,
  Plug,
  ShieldAlert,
  Bell,
  Users,
  ScrollText,
  Settings,
} from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/explore', label: 'Explore', icon: Search },
  { to: '/pipeline', label: 'Pipeline', icon: Workflow },
  { to: '/builder', label: 'Builder', icon: Blocks },
  { to: '/strategies', label: 'Strategies', icon: Lightbulb },
  { to: '/portfolio', label: 'Portfolio', icon: PieChart },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/research', label: 'Research', icon: BookOpen },
  { to: '/positions', label: 'Positions', icon: Briefcase },
  { to: '/markets', label: 'Markets', icon: CandlestickChart },
  { to: '/connections', label: 'Connections', icon: Plug },
  { to: '/risk', label: 'Risk', icon: ShieldAlert },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/roles', label: 'Roles', icon: Users },
  { to: '/audit', label: 'Audit', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <nav className="w-16 lg:w-52 shrink-0 border-r border-border bg-card/40 backdrop-blur-md flex flex-col py-3 gap-1">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary/15 text-primary border border-primary/40 shadow-neon'
                : 'text-subtext hover:text-text hover:bg-border/30 border border-transparent'
            }`
          }
        >
          <n.icon size={18} className="shrink-0" />
          <span className="hidden lg:inline">{n.label}</span>
        </NavLink>
      ))}
      <div className="mt-auto mx-3 hidden lg:block text-[10px] text-subtext/60 leading-relaxed">
        GIO RAPTOR · AI Strategy Lab
        <br />
        15-agent pipeline · global markets
        <br />
        <span className="text-warning/70">Demo — simulated, no live orders</span>
      </div>
    </nav>
  );
}
