'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { BookOpen, Plus, X } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils/format';

const MOODS = [
  { emoji: '\uD83D\uDE0E', label: 'Confident' },
  { emoji: '\uD83D\uDE0A', label: 'Happy' },
  { emoji: '\uD83D\uDE10', label: 'Neutral' },
  { emoji: '\uD83D\uDE1F', label: 'Anxious' },
  { emoji: '\uD83D\uDE21', label: 'Frustrated' },
  { emoji: '\uD83E\uDD14', label: 'Reflective' },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mood, setMood] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setEntries(data ?? []);
    setLoading(false);
  }

  async function saveEntry() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !title) return;

    await supabase.from('journal_entries').insert({
      user_id: user.id,
      mood,
      title,
      content,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setMood('');
    setTitle('');
    setContent('');
    setTags('');
    setShowModal(false);
    fetchEntries();
  }

  // Calendar month view data
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const entryByDay = new Map<number, Record<string, unknown>>();
  entries.forEach((e) => {
    const d = new Date(e.created_at as string);
    if (d.getFullYear() === year && d.getMonth() === month) {
      entryByDay.set(d.getDate(), e);
    }
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Trade Journal</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Entry
        </button>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-elevated p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-medium text-muted">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const entry = entryByDay.get(day);
            const isToday = day === now.getDate();
            return (
              <div
                key={day}
                className={cn(
                  'flex flex-col items-center rounded-md py-1.5 text-[10px]',
                  isToday && 'ring-1 ring-accent',
                  entry ? 'bg-accent/10' : 'bg-surface/20'
                )}
              >
                <span className="text-muted">{day}</span>
                {entry && <span className="text-sm">{entry.mood as string}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Entries List */}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Your journal is empty"
          description="Start documenting your trades and market observations."
          actionLabel="Write First Entry"
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const id = String(e.id ?? '');
            const moodStr = typeof e.mood === 'string' ? e.mood : '';
            const titleStr = String(e.title ?? '');
            const dateStr = String(e.created_at ?? '');
            const contentStr = typeof e.content === 'string' ? e.content : '';
            const tagsArr = Array.isArray(e.tags) ? (e.tags as string[]) : [];
            return (
            <div key={id} className="rounded-xl border border-border bg-elevated p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {moodStr !== '' && <span className="text-lg">{moodStr}</span>}
                  <h4 className="text-sm font-semibold text-foreground">{titleStr}</h4>
                </div>
                <span className="text-[10px] text-muted">
                  {new Date(dateStr).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>
              {contentStr && (
                <p className="text-xs text-secondary line-clamp-3 mb-2">{contentStr}</p>
              )}
              {tagsArr.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tagsArr.map((tag) => (
                    <span key={tag} className="rounded bg-surface px-2 py-0.5 text-[10px] text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* New Entry Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Journal Entry" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-secondary mb-2">How are you feeling?</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  onClick={() => setMood(m.emoji)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-colors',
                    mood === m.emoji ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface'
                  )}
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-muted">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title..."
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Write your thoughts..."
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. forex, scalping, risk-management"
              className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs text-secondary hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEntry}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/80 transition-colors"
            >
              Save Entry
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
