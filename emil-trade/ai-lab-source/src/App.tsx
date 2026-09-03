import { Routes, Route } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { ToastHost } from './components/Toasts';
import { KillSwitchModal } from './components/KillSwitchModal';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore } from './store';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Pipeline from './pages/Pipeline';
import Builder from './pages/Builder';
import Strategies from './pages/Strategies';
import Portfolio from './pages/Portfolio';
import Analytics from './pages/Analytics';
import Research from './pages/Research';
import Positions from './pages/Positions';
import Markets from './pages/Markets';
import Connections from './pages/Connections';
import Risk from './pages/Risk';
import Alerts from './pages/Alerts';
import Roles from './pages/Roles';
import Audit from './pages/Audit';
import Settings from './pages/Settings';

export default function App() {
  useWebSocket();
  const mode = useStore((s) => s.mode);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg text-text">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto relative">
          {mode === 'demo' && (
            <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-20 select-none opacity-[0.06] text-6xl font-black tracking-widest">
              DEMO MODE
            </div>
          )}
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/builder" element={<Builder />} />
              <Route path="/strategies" element={<Strategies />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/research" element={<Research />} />
              <Route path="/positions" element={<Positions />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/risk" element={<Risk />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
      <ToastHost />
      <KillSwitchModal />
    </div>
  );
}
