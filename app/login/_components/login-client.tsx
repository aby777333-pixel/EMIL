'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Activity, Lock, Mail, User, TrendingUp, ShieldCheck, BrainCircuit } from 'lucide-react'
import { toast } from 'sonner'

export function LoginClient() {
  const router = useRouter()
  const { status } = useSession() || {}
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [totp, setTotp] = useState('')
  const [needTotp, setNeedTotp] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [status, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? 'Signup failed.')
          setBusy(false)
          return
        }
      }
      const result = await signIn('credentials', { email, password, totp, redirect: false })
      if (result?.error === 'TOTP_REQUIRED') {
        setNeedTotp(true)
        toast('Enter the 6-digit code from your authenticator app.')
        setBusy(false)
        return
      }
      if (result?.error === 'TOTP_INVALID') {
        toast.error('That authenticator code is not valid.')
        setBusy(false)
        return
      }
      if (result?.error && /too many/i.test(result.error)) {
        toast.error(result.error)
        setBusy(false)
        return
      }
      if (result?.error) {
        // Surface real account-state messages (e.g. suspension); generic
        // CredentialsSignin stays "invalid email or password".
        toast.error(result.error !== 'CredentialsSignin' && /suspend|support/i.test(result.error) ? result.error : 'Invalid email or password.')
        setBusy(false)
        return
      }
      router.replace('/')
    } catch {
      toast.error('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(hsl(188,90%,53%) 1px, transparent 1px), linear-gradient(90deg, hsl(188,90%,53%) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-6 pr-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center terminal-glow">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">EMIL</h1>
              <p className="text-xs tracking-widest uppercase text-muted-foreground">Evolutionary Market Intelligence Layer</p>
            </div>
          </div>
          <p className="text-slate-400 leading-relaxed">
            A coordinated trading desk of 40 specialist AI agents. EMIL observes the past, understands the present,
            estimates possible futures, acts only when authorized — and protects the account above all.
          </p>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, text: 'Independent Risk Engine and Guardian with absolute veto power' },
              { icon: TrendingUp, text: '0.05-lot aggregate exposure cap, hard drawdown guard, capital protection' },
              { icon: BrainCircuit, text: 'Multi-agent council, self-learning, and full decision explainability' },
            ].map((f, i) => {
              const Icon = f?.icon
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
                  {Icon ? <Icon className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" /> : null}
                  <span className="text-sm text-slate-300">{f?.text}</span>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-600">
            Trading carries substantial financial risk. EMIL cannot guarantee profit or eliminate losses. Not trading is also a trading decision.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 terminal-glow" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span className="font-display text-xl font-bold text-white">EMIL Control Cockpit</span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-1">
            {mode === 'login' ? 'Sign in to the cockpit' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === 'login' ? 'Access your trading intelligence command center.' : 'Set up your EMIL command center.'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' ? (
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
                  className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
              </div>
            ) : null}
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                className="w-full rounded-md border border-input bg-background px-9 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
            {needTotp && mode === 'login' ? (
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400" />
                <input inputMode="numeric" autoComplete="one-time-code" required value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="Authenticator code (6 digits)"
                  className="w-full rounded-md border border-emerald-500/50 bg-background px-9 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              </div>
            ) : null}
            <button type="submit" disabled={busy}
              className="w-full rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-50">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-4 w-full text-center text-xs text-cyan-400 hover:text-cyan-300">
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
