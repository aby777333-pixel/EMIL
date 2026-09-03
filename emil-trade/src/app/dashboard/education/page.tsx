'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { GraduationCap, BookOpen, ChevronRight, Play, X, Clock } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn } from '@/lib/utils/format';

const CATEGORY_COLORS: Record<string, string> = {
  beginner: 'bg-profit/15 text-profit',
  intermediate: 'bg-gold/15 text-gold',
  advanced: 'bg-loss/15 text-loss',
  strategy: 'bg-accent/15 text-accent',
};

interface ReadingLesson {
  title: string;
  courseTitle: string;
  duration: number;
  html: string;
}

export default function EducationPage() {
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [reading, setReading] = useState<ReadingLesson | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('education_courses')
        .select('*, education_lessons(id, title, duration_minutes, sort_order, content_html)')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      setCourses(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-foreground">Education Hub</h1>
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">Education Hub</h1>
        <p className="text-xs text-secondary mt-0.5">Master the markets with structured courses</p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No courses available"
          description="Educational content will be available here soon."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const lessons = (course.education_lessons as Record<string, unknown>[]) ?? [];
            const lessonCount = lessons.length;
            const progress = (course.progress_pct as number) ?? 0;
            const expanded = expandedCourse === (course.id as string);
            const category = (course.category as string) ?? 'beginner';

            return (
              <div key={course.id as string} className="rounded-xl border border-border bg-elevated flex flex-col">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold capitalize', CATEGORY_COLORS[category] ?? 'bg-surface text-muted')}>
                      {category}
                    </span>
                    <span className="text-[10px] text-muted">{lessonCount} lessons</span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground">{course.title as string}</h3>
                  <p className="text-[10px] text-secondary line-clamp-2">{course.description as string}</p>

                  <ProgressBar value={progress} label="Progress" size="sm" />

                  <button
                    onClick={() => setExpandedCourse(expanded ? null : (course.id as string))}
                    className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    {expanded ? 'Hide Lessons' : 'View Lessons'}
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
                  </button>
                </div>

                {expanded && lessons.length > 0 && (
                  <div className="border-t border-border px-4 py-3 space-y-1.5">
                    {[...lessons]
                      .sort((a, b) => ((a.sort_order as number) ?? 0) - ((b.sort_order as number) ?? 0))
                      .map((lesson, i) => (
                        <div
                          key={lesson.id as string}
                          onClick={() =>
                            setReading({
                              title: lesson.title as string,
                              courseTitle: course.title as string,
                              duration: (lesson.duration_minutes as number) ?? 5,
                              html: (lesson.content_html as string) ?? '<p>Content coming soon.</p>',
                            })
                          }
                          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface/50 transition-colors cursor-pointer"
                        >
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-surface text-[10px] font-medium text-muted shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-xs text-foreground flex-1 truncate">{lesson.title as string}</span>
                          <BookOpen className="h-3 w-3 text-muted shrink-0" />
                          <span className="text-[10px] text-muted shrink-0">
                            {(lesson.duration_minutes as number) ?? 5}m
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lesson reader ── */}
      {reading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReading(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-elevated shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted">{reading.courseTitle}</p>
                <h2 className="mt-0.5 text-sm font-bold text-foreground">{reading.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                  <Clock className="h-3 w-3" /> {reading.duration} min read
                </p>
              </div>
              <button
                onClick={() => setReading(null)}
                className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
                aria-label="Close lesson"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              className={cn(
                'overflow-y-auto px-6 py-5 text-[13px] leading-relaxed text-secondary',
                '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mb-3',
                '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-2',
                '[&_p]:mb-3 [&_strong]:text-foreground [&_em]:text-foreground/80',
                '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5',
                '[&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5'
              )}
              dangerouslySetInnerHTML={{ __html: reading.html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
