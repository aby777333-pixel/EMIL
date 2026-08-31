export const fmtMoney = (v: number | null | undefined, currency = '$') => {
  const n = v ?? 0
  const sign = n < 0 ? '-' : ''
  return `${sign}${currency}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const fmtSigned = (v: number | null | undefined, currency = '$') => {
  const n = v ?? 0
  return `${n >= 0 ? '+' : '-'}${currency}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const fmtPct = (v: number | null | undefined, digits = 2) => `${(v ?? 0).toFixed(digits)}%`

export const fmtNum = (v: number | null | undefined, digits = 2) =>
  (v ?? 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const plColor = (v: number | null | undefined) =>
  (v ?? 0) > 0 ? 'text-emerald-400' : (v ?? 0) < 0 ? 'text-red-400' : 'text-slate-400'

export const healthColor = (status: string | null | undefined) => {
  switch (status ?? '') {
    case 'healthy': return 'text-emerald-400'
    case 'watch': return 'text-amber-400'
    case 'degraded': return 'text-orange-400'
    case 'suspended': return 'text-red-400'
    case 'research_only': return 'text-sky-400'
    default: return 'text-slate-400'
  }
}

export const volColor = (v: string | null | undefined) => {
  switch (v ?? '') {
    case 'normal': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    case 'elevated': return 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    case 'high': return 'text-orange-400 border-orange-500/30 bg-orange-500/10'
    case 'extreme': return 'text-red-400 border-red-500/30 bg-red-500/10'
    case 'disorderly': return 'text-red-300 border-red-500/50 bg-red-500/20'
    default: return 'text-slate-400 border-slate-500/30 bg-slate-500/10'
  }
}

export const voteColor = (vote: string | null | undefined) => {
  switch (vote ?? '') {
    case 'BUY': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'SELL': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'WAIT': return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
    case 'REJECT': return 'bg-red-500/20 text-red-300 border-red-500/40'
    case 'HEDGE': return 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    case 'REDUCE': return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'CLOSE': return 'bg-orange-500/15 text-orange-300 border-orange-500/30'
    case 'PAUSE': return 'bg-sky-500/15 text-sky-300 border-sky-500/30'
    default: return 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  }
}

export const MODE_LABELS: Record<string, string> = {
  observation: 'Observation',
  advisory: 'Advisory',
  confirmation: 'Confirmation',
  assisted: 'Assisted',
  semi_autonomous: 'Semi-Autonomous',
  autonomous: 'Autonomous',
  management_only: 'Management Only',
  capital_protection: 'Capital Protection',
  emergency: 'Emergency',
}
