'use client'

// Broker connect wizard (spec §6–7): permission tier → mandatory API
// disclaimer → credentials → connection test. The chosen tier and the
// acknowledged disclaimer are stored with the link and written to the consent
// log; only TRADING links can ever reach the order router.

import { useEffect, useMemo, useState } from 'react'
import { X, ChevronRight, ChevronLeft, KeyRound, ShieldCheck, ExternalLink, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { CRED_FIELDS, TIERS, CONSENT_VERSION, disclaimerItems, type PermissionTier } from './cred-fields'

type Props = {
  provider: any
  isAdmin: boolean
  onClose: () => void
  onSaved: (provider: any) => void
}

export default function ConnectWizard({ provider, isAdmin, onClose, onSaved }: Props) {
  const [step, setStep] = useState(0)
  const [tier, setTier] = useState<PermissionTier>(provider?.permissionTier ?? (/_(testnet|sandbox)$/.test(provider?.key ?? '') ? 'trading' : 'read_only'))
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ ok: boolean; message: string; provider?: any } | null>(null)

  const fields = CRED_FIELDS[provider?.authType] ?? CRED_FIELDS.api_key_secret_daily_token
  const items = useMemo(() => disclaimerItems(tier, provider?.vendor ?? 'the venue'), [tier, provider?.vendor])
  const allChecked = items.every((i) => checked[i.key])
  const hasCreds = fields.some((f) => (creds[f.key] ?? '').trim() !== '') || provider?.hasApiKey || provider?.hasAccessToken

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload: any = { type: 'save_credentials', key: provider.key, permissionTier: tier, consent: { version: CONSENT_VERSION, checkboxes: items.map((i) => i.key) } }
      for (const f of fields) if ((creds[f.key] ?? '').trim()) payload[f.key] = creds[f.key].trim()
      const save = await fetch('/api/india', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const saved = await save.json().catch(() => ({}))
      if (!save.ok) { setError(saved?.error ?? 'Could not save the credentials.'); return }
      const test = await fetch('/api/india', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'test_connection', key: provider.key }) })
      const tested = await test.json().catch(() => ({}))
      const finalProvider = tested?.provider ?? saved?.provider
      setResult({ ok: !!tested?.ok, message: tested?.message ?? (test.ok ? 'Saved.' : tested?.error ?? 'Connection test failed.'), provider: finalProvider })
      if (finalProvider) onSaved(finalProvider)
      setStep(3)
    } catch (e: any) {
      setError(e?.message ?? 'Network error.')
    } finally {
      setBusy(false)
    }
  }

  const steps = ['Permissions', 'Disclaimer', 'Credentials', 'Result']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Connect {isAdmin ? 'house account' : 'your account'}</div>
            <div className="text-lg font-semibold text-white tracking-tight">{provider?.name}</div>
            <div className="text-xs text-slate-500">{provider?.vendor}{/_(testnet|sandbox)$/.test(provider?.key ?? '') ? ' · TEST environment — test funds only' : ''}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex items-center gap-1 px-5 pt-3 text-[10px] uppercase tracking-wider">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`rounded-full px-2 py-0.5 ${i === step ? 'bg-cyan-500/20 text-cyan-300' : i < step ? 'text-emerald-300' : 'text-slate-600'}`}>{i + 1}. {s}</span>
              {i < steps.length - 1 ? <ChevronRight className="h-3 w-3 text-slate-700" /> : null}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
          {step === 0 ? (
            <>
              <p className="text-xs text-slate-400">Choose what EMIL is allowed to do with this account. The tier is enforced on the server — a Read-only link can never place an order, whatever the key permits at the venue.</p>
              {TIERS.map((t) => (
                <button key={t.key} onClick={() => setTier(t.key)} className={`w-full text-left rounded-lg border p-3 transition-colors ${tier === t.key ? t.tone : 'border-border bg-secondary/30 hover:border-slate-500/50'}`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-sm font-semibold">{t.label}</span>
                    {tier === t.key ? <span className="ml-auto text-[10px] uppercase tracking-wider">selected</span> : null}
                  </div>
                  <p className="text-xs opacity-90 mt-1">{t.summary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[11px]">
                    <ul className="space-y-0.5">{t.allows.map((a) => <li key={a} className="flex gap-1"><span className="text-emerald-400">✓</span><span className="text-slate-300">{a}</span></li>)}</ul>
                    <ul className="space-y-0.5">{t.never.map((a) => <li key={a} className="flex gap-1"><span className="text-red-400">✕</span><span className="text-slate-400">{a}</span></li>)}</ul>
                  </div>
                </button>
              ))}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                <span>Mandatory API disclaimer. Every item must be acknowledged; your acknowledgement is recorded in the consent log with a timestamp and version <span className="font-mono">{CONSENT_VERSION}</span>.</span>
              </div>
              {items.map((i) => (
                <label key={i.key} className="flex gap-3 items-start rounded-lg border border-border bg-secondary/30 p-3 cursor-pointer hover:border-slate-500/50">
                  <input type="checkbox" checked={!!checked[i.key]} onChange={(e) => setChecked((c) => ({ ...c, [i.key]: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-cyan-500" />
                  <span className="text-xs text-slate-200">{i.text}</span>
                </label>
              ))}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="text-xs text-slate-400">{provider?.authNote}</p>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <a href={provider?.docsUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">Docs <ExternalLink className="h-3 w-3" /></a>
                {(provider?.links ?? []).filter((l: any) => l?.url && l.url !== provider?.docsUrl).map((l: any) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-cyan-400/90 hover:underline flex items-center gap-1">{l.label} <ExternalLink className="h-3 w-3" /></a>
                ))}
              </div>
              <div className="space-y-2">
                {fields.map((f) => (
                  <input
                    key={f.key}
                    type={f.secret ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={f.key === 'apiKey' && provider?.hasApiKey ? `${f.label} — saved (${provider?.apiKeyMasked}); paste to replace` : f.label}
                    value={creds[f.key] ?? ''}
                    onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                    className="w-full rounded-md bg-secondary/60 border border-border px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                ))}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Stored encrypted server-side; never sent back to the browser. Leave a field blank to keep the saved value.</p>
              {error ? <p className="text-xs text-red-400">{error}</p> : null}
            </>
          ) : null}

          {step === 3 && result ? (
            <div className={`rounded-lg border p-4 ${result.ok ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {result.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-red-300" />}
                <span className={result.ok ? 'text-emerald-200' : 'text-red-200'}>{result.ok ? 'Connected' : 'Saved, but the connection test failed'}</span>
              </div>
              <p className="text-xs text-slate-200 mt-2">{result.message}</p>
              <p className="text-[11px] text-slate-400 mt-2">Permission tier: <span className="uppercase font-semibold text-slate-200">{tier.replace('_', '-')}</span>. You can re-run Connect at any time to change it.</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          {step > 0 && step < 3 ? (
            <button onClick={() => setStep((s) => s - 1)} disabled={busy} className="rounded-md border border-border px-3 py-1.5 text-xs text-slate-300 flex items-center gap-1"><ChevronLeft className="h-3.5 w-3.5" /> Back</button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {step < 2 ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !allChecked} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white flex items-center gap-1">Continue <ChevronRight className="h-3.5 w-3.5" /></button>
            ) : null}
            {step === 2 ? (
              <button onClick={submit} disabled={busy || !hasCreds} className="rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-1.5 text-xs font-semibold text-white flex items-center gap-1">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} {busy ? 'Saving & testing…' : 'Save & test connection'}
              </button>
            ) : null}
            {step === 3 ? (
              <button onClick={onClose} className="rounded-md bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white">Done</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
