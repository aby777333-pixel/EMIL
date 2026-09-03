// ═══════════════════════════════════════════════════════════════
// EMIL multilingual layer — dual-engine architecture.
// The existing deterministic English rule parser (emil-mission) remains
// the PRIMARY and fallback engine at all times. Lara is an ADDITIVE,
// optional, consent-gated assist for Indian-language and mixed-language
// input, reached only through the server proxy (/api/sarvam) so no key
// ever touches the client. Language processing NEVER executes a trade:
// every path ends at the same read-back → trader-confirm → envelope
// pipeline, and ambiguous commands are flagged, never guessed.
// ═══════════════════════════════════════════════════════════════

// ── Language preferences (§3/§15 consent) ───────────────────────

export interface LangPrefs {
  sarvamEnabled: boolean;      // master switch — OFF by default
  consentAt: number | null;    // when the trader accepted the data-sharing note
  displayLang: string;         // 'en' or a code below — response/display preference
  detectAuto: boolean;         // auto-detect input language
  translationOnly: boolean;    // use Lara only to translate, never for chat
}

const LANG_KEY = 'raptor_emil_lang_v1';

export const DEFAULT_LANG_PREFS: LangPrefs = {
  sarvamEnabled: false, consentAt: null, displayLang: 'en', detectAuto: true, translationOnly: true,
};

export function loadLangPrefs(): LangPrefs {
  try { return { ...DEFAULT_LANG_PREFS, ...(JSON.parse(localStorage.getItem(LANG_KEY) || '{}')) }; } catch { return { ...DEFAULT_LANG_PREFS }; }
}

export function saveLangPrefs(p: LangPrefs): void {
  try { localStorage.setItem(LANG_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Expected Indian-language set (architecture reads the live list from the
// service where available; this local list is the honest expectation, not
// a hard-coded promise of support).
export const EXPECTED_LANGS: Array<{ code: string; name: string; native: string }> = [
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta-IN', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn-IN', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr-IN', name: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'od-IN', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'ur-IN', name: 'Urdu', native: 'اردو' },
];

// ── §4 Script + language detection (local, deterministic) ───────

const SCRIPT_RANGES: Array<{ code: string; name: string; re: RegExp }> = [
  { code: 'hi-IN', name: 'Devanagari (Hindi/Marathi)', re: /[ऀ-ॿ]/ },
  { code: 'bn-IN', name: 'Bengali', re: /[ঀ-৿]/ },
  { code: 'pa-IN', name: 'Gurmukhi (Punjabi)', re: /[਀-੿]/ },
  { code: 'gu-IN', name: 'Gujarati', re: /[઀-૿]/ },
  { code: 'od-IN', name: 'Odia', re: /[଀-୿]/ },
  { code: 'ta-IN', name: 'Tamil', re: /[஀-௿]/ },
  { code: 'te-IN', name: 'Telugu', re: /[ఀ-౿]/ },
  { code: 'kn-IN', name: 'Kannada', re: /[ಀ-೿]/ },
  { code: 'ml-IN', name: 'Malayalam', re: /[ഀ-ൿ]/ },
  { code: 'ur-IN', name: 'Arabic script (Urdu)', re: /[؀-ۿ]/ },
];

// Romanised Indian-language hint words (code-switching detection).
const ROMAN_HINTS = /\b(pannu|panna|vendam|venam|cheyyuka|cheyyu|parayu|aruthu|illa|irukku|karo|karna|mat|nahi|chahiye|kare|hona|wale|enne|ennu|njan|nee)\b/i;

export interface LangDetect { lang: string | null; label: string; mixed: boolean; confidence: 'high' | 'medium' | 'low' }

export function detectLanguageLocal(text: string): LangDetect {
  for (const s of SCRIPT_RANGES) {
    if (s.re.test(text)) {
      const hasLatin = /[a-zA-Z]{3,}/.test(text);
      return { lang: s.code, label: s.name, mixed: hasLatin, confidence: 'high' };
    }
  }
  if (ROMAN_HINTS.test(text)) return { lang: null, label: 'Romanised Indian language (code-switched)', mixed: true, confidence: 'medium' };
  return { lang: 'en', label: 'English', mixed: false, confidence: 'high' };
}

// ── §1 Routing layer: which engine handles this input ───────────

export interface RouteDecision {
  engine: 'rules' | 'sarvam+rules';
  reason: string;
  detect: LangDetect;
}

export function routeCommand(text: string, prefs: LangPrefs, sarvamConfigured: boolean): RouteDecision {
  const detect = detectLanguageLocal(text);
  if (detect.lang === 'en' && !detect.mixed) return { engine: 'rules', reason: 'English input — deterministic rule parser handles it directly', detect };
  if (!prefs.sarvamEnabled) return { engine: 'rules', reason: `${detect.label} detected but Lara is disabled — rule parser will flag what it cannot read`, detect };
  if (!prefs.consentAt) return { engine: 'rules', reason: 'Lara consent not recorded — nothing leaves the device', detect };
  if (!sarvamConfigured) return { engine: 'rules', reason: 'Lara not configured on the server — rule parser remains active', detect };
  return { engine: 'sarvam+rules', reason: `${detect.label} detected — Lara translates, then the SAME rule parser + read-back + confirm pipeline applies`, detect };
}

/** Translate via the server proxy. Never throws — falls back honestly.
 *  Pass the locally-detected script code as sourceLang: Lara requires an
 *  explicit (or detectable) source language. */
export async function sarvamTranslate(text: string, sourceLang?: string | null): Promise<{ ok: boolean; translated: string | null; error: string | null }> {
  try {
    const r = await fetch('/api/sarvam', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'translate', text, targetLang: 'en-IN', sourceLang: sourceLang ?? undefined }),
    });
    const j = await r.json();
    if (j.ok && j.translated) return { ok: true, translated: String(j.translated), error: null };
    return { ok: false, translated: null, error: String(j.error ?? 'translation unavailable') };
  } catch {
    return { ok: false, translated: null, error: 'language service unreachable — default engine continues' };
  }
}

/** Voice command via Lara speech-to-text-translate: returns an ENGLISH
 *  transcript (translation happens server-side in one hop) plus the detected
 *  spoken language. Never throws. */
export async function sarvamSpeech(audioBase64: string): Promise<{ ok: boolean; transcript: string | null; language: string | null; error: string | null }> {
  try {
    const r = await fetch('/api/sarvam', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stt', audioBase64 }),
    });
    const j = await r.json();
    if (j.ok && j.transcript) return { ok: true, transcript: String(j.transcript), language: j.language ? String(j.language) : null, error: null };
    return { ok: false, transcript: null, language: null, error: String(j.error ?? 'speech service unavailable') };
  } catch {
    return { ok: false, transcript: null, language: null, error: 'speech service unreachable' };
  }
}

/** Spoken read-back via Lara text-to-speech. Plays through the browser;
 *  never throws — returns false honestly when unavailable. The caller
 *  passes the final display string verbatim so critical numbers stay exact. */
export async function laraSpeak(text: string, lang?: string): Promise<boolean> {
  try {
    const prefs = loadLangPrefs();
    if (!prefs.sarvamEnabled || !prefs.consentAt) return false;
    const r = await fetch('/api/sarvam', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tts', text, targetLang: lang ?? (prefs.displayLang !== 'en' ? prefs.displayLang : 'en-IN') }),
    });
    const j = await r.json();
    if (!j.ok || !j.audioBase64) return false;
    const audio = new Audio(`data:audio/wav;base64,${j.audioBase64}`);
    await audio.play();
    return true;
  } catch { return false; }
}

// ── Microphone → 16 kHz mono WAV (what Lara's speech API expects) ──

export interface VoiceCapture { stop: () => Promise<{ base64: string; seconds: number }> }

export async function startVoiceCapture(): Promise<VoiceCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true } });
  const ctx = new AudioContext({ sampleRate: 16000 });
  const source = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  proc.onaudioprocess = (e) => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
  source.connect(proc);
  proc.connect(ctx.destination);
  const startedAt = Date.now();
  return {
    stop: async () => {
      proc.disconnect(); source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      const sampleRate = ctx.sampleRate;
      await ctx.close();
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const pcm = new Float32Array(total);
      let off = 0;
      for (const c of chunks) { pcm.set(c, off); off += c.length; }
      // Encode 16-bit PCM WAV.
      const buf = new ArrayBuffer(44 + pcm.length * 2);
      const dv = new DataView(buf);
      const wStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
      wStr(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); wStr(8, 'WAVE');
      wStr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
      wStr(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        dv.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { base64: btoa(bin), seconds: Math.round((Date.now() - startedAt) / 1000) };
    },
  };
}

export async function sarvamHealth(): Promise<boolean> {
  try {
    const r = await fetch('/api/sarvam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'health' }) });
    const j = await r.json();
    return !!j.configured;
  } catch { return false; }
}

// ── §8 Multilingual financial glossary (admin-reviewable seed) ──

export interface GlossaryTerm { en: string; hi: string; ta: string; ml: string }

export const GLOSSARY: GlossaryTerm[] = [
  { en: 'Buy', hi: 'खरीदें', ta: 'வாங்கு', ml: 'വാങ്ങുക' },
  { en: 'Sell', hi: 'बेचें', ta: 'விற்க', ml: 'വിൽക്കുക' },
  { en: 'Stop loss', hi: 'स्टॉप लॉस', ta: 'ஸ்டாப் லாஸ்', ml: 'സ്റ്റോപ്പ് ലോസ്' },
  { en: 'Take profit', hi: 'टेक प्रॉफिट', ta: 'டேக் பிராஃபிட்', ml: 'ടേക്ക് പ്രോഫിറ്റ്' },
  { en: 'Lot size', hi: 'लॉट साइज़', ta: 'லாட் அளவு', ml: 'ലോട്ട് വലുപ്പം' },
  { en: 'Margin', hi: 'मार्जिन', ta: 'மார்ஜின்', ml: 'മാർജിൻ' },
  { en: 'Spread', hi: 'स्प्रेड', ta: 'ஸ்ப்ரெட்', ml: 'സ്പ്രെഡ്' },
  { en: 'Drawdown', hi: 'ड्रॉडाउन', ta: 'டிராடவுன்', ml: 'ഡ്രോഡൗൺ' },
  { en: 'Hedge', hi: 'हेज', ta: 'ஹெட்ஜ்', ml: 'ഹെഡ്ജ്' },
  { en: 'Capital', hi: 'पूंजी', ta: 'மூலதனம்', ml: 'മൂലധനം' },
  { en: 'Profit', hi: 'लाभ', ta: 'லாபம்', ml: 'ലാഭം' },
  { en: 'Loss', hi: 'हानि', ta: 'நஷ்டம்', ml: 'നഷ്ടം' },
  { en: 'Risk warning', hi: 'जोखिम चेतावनी', ta: 'இடர் எச்சரிக்கை', ml: 'റിസ്ക് മുന്നറിയിപ്പ്' },
  { en: 'Emergency stop', hi: 'आपातकालीन स्टॉप', ta: 'அவசர நிறுத்தம்', ml: 'അടിയന്തര സ്റ്റോപ്പ്' },
];

// ── §19 Audit log — never stores secrets ────────────────────────

export interface LangAuditEntry {
  ts: number; original: string; detected: string; engine: string;
  translated: string | null; action: string;
}

const LANG_AUDIT_KEY = 'raptor_emil_lang_audit_v1';

export function langAudit(e: Omit<LangAuditEntry, 'ts'>): void {
  try {
    const list = JSON.parse(localStorage.getItem(LANG_AUDIT_KEY) || '[]') as LangAuditEntry[];
    list.push({ ts: Date.now(), ...e });
    localStorage.setItem(LANG_AUDIT_KEY, JSON.stringify(list.slice(-100)));
  } catch { /* ignore */ }
}

export function loadLangAudit(): LangAuditEntry[] {
  try { return JSON.parse(localStorage.getItem(LANG_AUDIT_KEY) || '[]'); } catch { return []; }
}
