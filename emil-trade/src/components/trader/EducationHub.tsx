'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Play, Award, Zap, Star, Clock,
  ChevronRight, Trophy, Flame, Target, GraduationCap,
  Video, MessageCircle,
} from 'lucide-react';
import type { Course, UserProgress } from '@/types/trader';

const LEVEL_COLORS = {
  beginner: '#00dc82',
  intermediate: '#00b4ff',
  advanced: '#f59e0b',
  professional: '#8b5cf6',
};

function ProgressRing({ pct, size = 40, color }: { pct: number; size?: number; color: string }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${(pct / 100) * circumference} ${circumference}` }}
        transition={{ duration: 0.8 }}
      />
    </svg>
  );
}

interface EducationHubProps {
  courses: Course[];
  progress: UserProgress;
  onStartCourse: (courseId: string) => void;
}

export function EducationHub({ courses, progress, onStartCourse }: EducationHubProps) {
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'professional'>('all');

  const filtered = courses.filter(c => filter === 'all' || c.level === filter);

  const xpForNextLevel = progress.level * 500;
  const xpPct = (progress.totalXp % 500) / 5;

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-gradient-to-r from-[#00b4ff]/5 to-[#8b5cf6]/5 border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-6">
          <div className="relative">
            <ProgressRing pct={xpPct} size={64} color="#00b4ff" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">{progress.level}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-white">Level {progress.level}</span>
              <span className="text-[10px] text-white/25">{progress.totalXp} XP</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full w-48 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#00b4ff] to-[#8b5cf6]" />
            </div>
            <div className="text-[10px] text-white/20 mt-1">{xpForNextLevel - (progress.totalXp % 500)} XP to next level</div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="flex items-center gap-1 text-[#f59e0b]">
                <Flame className="h-4 w-4" />
                <span className="text-lg font-bold">{progress.streak}</span>
              </div>
              <div className="text-[9px] text-white/20">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-[#00dc82]">
                <Trophy className="h-4 w-4" />
                <span className="text-lg font-bold">{progress.badges.length}</span>
              </div>
              <div className="text-[9px] text-white/20">Badges</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-[#00b4ff]">
                <Target className="h-4 w-4" />
                <span className="text-lg font-bold">{progress.quizzesPassed}</span>
              </div>
              <div className="text-[9px] text-white/20">Quizzes</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {progress.badges.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            {progress.badges.map(badge => (
              <span key={badge} className="px-2 py-1 rounded-lg bg-white/5 text-[10px] text-white/40 flex items-center gap-1">
                <Award className="h-3 w-3 text-[#f59e0b]" />{badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Level Filter */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 w-fit">
        {(['all', 'beginner', 'intermediate', 'advanced', 'professional'] as const).map(l => (
          <button key={l} onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              filter === l ? 'bg-white/10 text-white' : 'text-white/40'
            }`}>
            {l === 'all' ? 'All Courses' : l}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((course, i) => {
          const pct = course.lessonCount > 0 ? (course.completedLessons / course.lessonCount) * 100 : 0;
          const levelColor = LEVEL_COLORS[course.level];

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-all group cursor-pointer"
              onClick={() => onStartCourse(course.id)}
            >
              {/* Thumbnail */}
              <div className="h-32 bg-gradient-to-br from-white/[0.02] to-white/[0.05] relative flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-white/10" />
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{
                    backgroundColor: `${levelColor}15`, color: levelColor,
                  }}>{course.level}</span>
                </div>
                {pct > 0 && pct < 100 && (
                  <div className="absolute top-3 right-3">
                    <ProgressRing pct={pct} size={28} color={levelColor} />
                  </div>
                )}
                {pct >= 100 && (
                  <div className="absolute top-3 right-3 p-1 rounded-full bg-[#00dc82]/20">
                    <Award className="h-4 w-4 text-[#00dc82]" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-[#00b4ff] transition-colors">
                  {course.title}
                </h3>
                <p className="text-[11px] text-white/30 line-clamp-2 mb-3">{course.description}</p>

                <div className="flex items-center justify-between text-[10px] text-white/25">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{course.lessonCount} lessons</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[#f59e0b]"><Zap className="h-3 w-3" />+{course.xpReward} XP</span>
                </div>

                {pct > 0 && (
                  <div className="mt-3">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: levelColor }} />
                    </div>
                    <div className="text-[9px] text-white/15 mt-1">{course.completedLessons}/{course.lessonCount} completed</div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
