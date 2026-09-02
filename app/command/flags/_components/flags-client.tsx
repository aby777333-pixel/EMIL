'use client'

// Command Center → Feature Flags (spec §77). High-risk modules ship behind
// these; a flip takes effect app-wide within ~30 seconds without a deploy.

import { useCallback, useEffect, useState } from 'react'
import { Flag, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'

type FlagRow = { id: string; key: string; label: string; description?: string | null; enabled: boolean; updatedAt: string }

export default function FlagsClient() {
  const [flags, setFlags] = useState<FlagRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/command/flags')
      const data = await res.json().catch(() => ({}))
      if (res.ok) setFlags(data?.flags ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (key: string) => {
    setBusyKey(key)
    try {
      const res = await fetch('/api/command/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'toggle', key }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`${key} is now ${data?.flag?.enabled ? 'ON' : 'OFF'} (takes effect within ~30s).`)
        load()
      } else {
        toast.error(data?.error ?? 'Toggle failed.')
      }
    } catch {
      toast.error('Toggle failed — connection error.')
    } finally {
      setBusyKey(null)
    }
  }

  const create = async () => {
    if (!newKey.trim() || !newLabel.trim()) return toast.error('Key and label are required.')
    try {
      const res = await fetch('/api/command/flags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'create', key: newKey, label: newLabel, description: newDesc || undefined }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Flag created (OFF by default).')
        setNewKey(''); setNewLabel(''); setNewDesc('')
        load()
      } else {
        toast.error(data?.error ?? 'Create failed.')
      }
    } catch {
      toast.error('Create failed — connection error.')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Flag className="h-6 w-6 text-amber-400" /> Feature Flags
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-risk modules deploy behind these flags (spec §77). Flips are audited and take effect
          app-wide within ~30 seconds — no redeploy needed. New flags start OFF.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? <div className="p-4 text-xs text-slate-500">Loading…</div>
        : flags.length === 0 ? <div className="p-4 text-xs text-slate-500">No flags defined.</div>
        : (
          <div className="divide-y divide-border">
            {flags.map((f) => (
              <div key={f.key} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{f.label}</span>
                    <span className="font-mono text-[10px] text-slate-500 border border-border rounded px-1.5 py-0.5">{f.key}</span>
                  </div>
                  {f.description ? <div className="text-xs text-slate-400 mt-0.5">{f.description}</div> : null}
                </div>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${f.enabled ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5' : 'text-slate-400 border-slate-500/30 bg-slate-500/5'}`}>
                  {f.enabled ? 'ON' : 'OFF'}
                </span>
                <Switch checked={f.enabled} disabled={busyKey === f.key} onCheckedChange={() => toggle(f.key)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-200 flex items-center gap-2"><Plus className="h-4 w-4 text-amber-400" /> New flag</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-400">
            Key (snake_case)
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="my_new_module" className="mt-1 block w-44 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-mono text-slate-200" />
          </label>
          <label className="text-xs text-slate-400 flex-1 min-w-[180px]">
            Label
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="My new module" className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200" />
          </label>
          <label className="text-xs text-slate-400 flex-1 min-w-[220px]">
            Description (optional)
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="what it gates, and why" className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-slate-200" />
          </label>
          <button onClick={create} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors">
            CREATE (OFF)
          </button>
        </div>
      </div>
    </div>
  )
}
