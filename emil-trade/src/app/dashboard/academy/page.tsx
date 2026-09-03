'use client';

import { EducationHub } from '@/components/trader/EducationHub';
import type { Course, UserProgress } from '@/types/trader';

const MOCK_COURSES: Course[] = [
  { id: 'c1', title: 'Trading Fundamentals', description: 'Learn the basics of forex, CFDs, and financial markets. Perfect for absolute beginners.', level: 'beginner', lessonCount: 12, completedLessons: 12, duration: '3h 20m', thumbnailUrl: null, xpReward: 500, badge: 'First Steps' },
  { id: 'c2', title: 'Technical Analysis Mastery', description: 'Chart patterns, indicators, support/resistance, and trend analysis techniques.', level: 'beginner', lessonCount: 18, completedLessons: 14, duration: '5h 45m', thumbnailUrl: null, xpReward: 750, badge: 'Chart Reader' },
  { id: 'c3', title: 'Risk Management Pro', description: 'Position sizing, stop-loss strategies, portfolio heat, and the math of survival.', level: 'intermediate', lessonCount: 10, completedLessons: 6, duration: '2h 50m', thumbnailUrl: null, xpReward: 600, badge: 'Risk Manager' },
  { id: 'c4', title: 'Price Action Trading', description: 'Pure price action: candlestick patterns, order flow, supply and demand zones.', level: 'intermediate', lessonCount: 15, completedLessons: 0, duration: '4h 30m', thumbnailUrl: null, xpReward: 800, badge: null },
  { id: 'c5', title: 'Algorithmic Trading with RAPTOR', description: 'Build, test, and deploy automated strategies using EMIL TRADE scripting engine.', level: 'advanced', lessonCount: 20, completedLessons: 0, duration: '7h 15m', thumbnailUrl: null, xpReward: 1200, badge: 'Algo Builder' },
  { id: 'c6', title: 'Institutional Order Flow', description: 'Smart money concepts, institutional footprint, and market microstructure.', level: 'advanced', lessonCount: 14, completedLessons: 0, duration: '4h 00m', thumbnailUrl: null, xpReward: 900, badge: null },
  { id: 'c7', title: 'Portfolio Construction & Hedging', description: 'Multi-asset portfolio theory, correlation, hedging strategies, and Kelly criterion.', level: 'professional', lessonCount: 12, completedLessons: 0, duration: '3h 40m', thumbnailUrl: null, xpReward: 1000, badge: 'Portfolio Architect' },
  { id: 'c8', title: 'Prop Firm Challenge Masterclass', description: 'Strategies and risk management techniques specifically for passing prop challenges.', level: 'intermediate', lessonCount: 8, completedLessons: 3, duration: '2h 10m', thumbnailUrl: null, xpReward: 500, badge: null },
  { id: 'c9', title: 'Copy Trading Provider Guide', description: 'How to become a successful signal provider and build a following on RAPTOR.', level: 'advanced', lessonCount: 6, completedLessons: 0, duration: '1h 45m', thumbnailUrl: null, xpReward: 400, badge: 'Signal Provider' },
];

const MOCK_PROGRESS: UserProgress = {
  totalXp: 2350,
  level: 5,
  streak: 7,
  badges: ['First Steps', 'Chart Reader', '7-Day Streak', 'Quiz Master'],
  coursesCompleted: 1,
  quizzesPassed: 14,
};

export default function AcademyPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">RAPTOR Academy</h1>
        <p className="text-xs text-white/30">Learn trading from beginner to professional — earn XP, badges, and unlock levels</p>
      </div>
      <EducationHub courses={MOCK_COURSES} progress={MOCK_PROGRESS} onStartCourse={(id) => console.log('Start course', id)} />
    </div>
  );
}
