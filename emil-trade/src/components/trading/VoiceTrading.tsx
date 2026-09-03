'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Check, AlertCircle, Volume2 } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import { cn } from '@/lib/utils/format';
import { loadLangPrefs, sarvamHealth, sarvamSpeech, startVoiceCapture, langAudit, laraSpeak, type VoiceCapture } from '@/lib/trading/emil-language';

/* ── Global type augmentation for Web Speech API ── */
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/* ── Web Speech API type declarations ── */
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error';

interface ParsedCommand {
  action: 'buy' | 'sell' | 'close' | 'close_all' | 'price' | 'positions';
  size?: number;
  symbol?: string;
  displayText: string;
}

// Check for Web Speech API support (Chrome uses webkitSpeechRecognition)
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const SR: SpeechRecognitionConstructor | undefined =
    window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return SR ?? null;
}

const KNOWN_SYMBOLS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  'US30', 'NAS100', 'SPX500', 'USOIL', 'UKOIL', 'NATGAS',
];

function normalizeSymbol(raw: string): string | null {
  const upper = raw.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
  // Direct match
  if (KNOWN_SYMBOLS.includes(upper)) return upper;
  // Common speech-to-text misinterpretations
  const aliases: Record<string, string> = {
    EURO: 'EURUSD', EURODOLLAR: 'EURUSD', EUROUSD: 'EURUSD',
    CABLE: 'GBPUSD', POUND: 'GBPUSD', POUNDDOLLAR: 'GBPUSD',
    DOLLARYEN: 'USDJPY', YEN: 'USDJPY',
    GOLD: 'XAUUSD', SILVER: 'XAGUSD',
    BITCOIN: 'BTCUSD', BTC: 'BTCUSD',
    ETHEREUM: 'ETHUSD', ETH: 'ETHUSD', ETHER: 'ETHUSD',
    DOW: 'US30', DOWJONES: 'US30',
    NASDAQ: 'NAS100', NASDAQ100: 'NAS100',
    SP500: 'SPX500', SANDP: 'SPX500', SANDP500: 'SPX500',
    OIL: 'USOIL', CRUDEOIL: 'USOIL', CRUDE: 'USOIL',
    BRENTOIL: 'UKOIL', BRENT: 'UKOIL',
    NATURALGAS: 'NATGAS', GAS: 'NATGAS',
    AUSSIE: 'AUDUSD', KIWI: 'NZDUSD', LOONIE: 'USDCAD', SWISSY: 'USDCHF',
  };
  if (aliases[upper]) return aliases[upper];
  // Fuzzy: check if any known symbol is a substring
  for (const sym of KNOWN_SYMBOLS) {
    if (upper.includes(sym)) return sym;
  }
  return null;
}

function parseCommand(transcript: string): ParsedCommand | null {
  const text = transcript.toLowerCase().trim();
  const words = text.split(/\s+/);

  // "close all"
  if (text.includes('close all')) {
    return { action: 'close_all', displayText: 'Close all positions' };
  }

  // "show my positions" / "my positions" / "show positions"
  if (text.includes('position') || text.includes('show my')) {
    return { action: 'positions', displayText: 'Show open positions' };
  }

  // "what is [symbol]" / "price of [symbol]"
  if (text.includes('what is') || text.includes('price of') || text.includes('price for')) {
    const remaining = text.replace(/what is|price of|price for/g, '').trim();
    const symbol = normalizeSymbol(remaining);
    if (symbol) {
      return { action: 'price', symbol, displayText: `Show price for ${symbol}` };
    }
  }

  // "close [symbol]"
  if (words[0] === 'close' && words.length >= 2) {
    const symbolPart = words.slice(1).join('');
    const symbol = normalizeSymbol(symbolPart);
    if (symbol) {
      return { action: 'close', symbol, displayText: `Close ${symbol} position` };
    }
  }

  // "buy [size] [symbol]" or "sell [size] [symbol]"
  if (words[0] === 'buy' || words[0] === 'sell') {
    const action = words[0] as 'buy' | 'sell';

    if (words.length >= 3) {
      // Try: buy 0.1 EURUSD
      const sizeStr = words[1];
      const size = parseFloat(sizeStr);
      const symbolPart = words.slice(2).join('');
      const symbol = normalizeSymbol(symbolPart);

      if (!isNaN(size) && size > 0 && symbol) {
        return {
          action,
          size,
          symbol,
          displayText: `${action.charAt(0).toUpperCase() + action.slice(1)} ${size} lot ${symbol} at market`,
        };
      }
    }

    if (words.length >= 2) {
      // Try: buy EURUSD (default size 0.01)
      const symbolPart = words.slice(1).join('');
      const symbol = normalizeSymbol(symbolPart);
      if (symbol) {
        return {
          action,
          size: 0.01,
          symbol,
          displayText: `${action.charAt(0).toUpperCase() + action.slice(1)} 0.01 lot ${symbol} at market`,
        };
      }

      // Try if second word is a number: buy 0.5
      const size = parseFloat(words[1]);
      if (!isNaN(size) && size > 0 && words.length >= 3) {
        // Already handled above
      }
    }
  }

  return null;
}

interface VoiceTradingProps {
  onClose: () => void;
}

export default function VoiceTrading({ onClose }: VoiceTradingProps) {
  const { prices, activeAccountId } = useTradingStore();

  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedCommand | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const [confirmTimer, setConfirmTimer] = useState(10);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sarvamReady, setLaraReady] = useState(false);
  const sarvamCapRef = useRef<VoiceCapture | null>(null);

  // Check support on mount. Lara (consented + configured) upgrades voice
  // to MULTILINGUAL speech-to-text-translate; browser speech (English)
  // remains the fallback. The confirmation step is mandatory either way.
  useEffect(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSupported(false);
    }
    const prefs = loadLangPrefs();
    if (prefs.sarvamEnabled && prefs.consentAt) {
      sarvamHealth().then((ok) => setLaraReady(ok));
    }
  }, []);

  // Spoken read-back (Lara TTS) when a command reaches confirmation —
  // the exact display string is spoken so critical numbers stay identical.
  useEffect(() => {
    if (state === 'confirming' && parsed && sarvamReady) {
      void laraSpeak(`Please confirm: ${parsed.displayText}. Say nothing — press the confirm button to execute.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Confirmation auto-cancel timer
  useEffect(() => {
    if (state === 'confirming') {
      setConfirmTimer(10);
      confirmTimerRef.current = setInterval(() => {
        setConfirmTimer((prev) => {
          if (prev <= 1) {
            // Auto-cancel
            setState('idle');
            setParsed(null);
            setTranscript('');
            setFeedback('Command timed out');
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (confirmTimerRef.current) {
        clearInterval(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    }
    return () => {
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
    };
  }, [state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;

    setTranscript('');
    setParsed(null);
    setErrorMsg('');
    setFeedback('');
    setState('listening');

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setState('processing');

        const cmd = parseCommand(finalTranscript);
        if (cmd) {
          setParsed(cmd);
          setState('confirming');
        } else {
          setState('error');
          setErrorMsg(
            "Sorry, I didn't understand. Try: \"Buy 0.1 EURUSD\" or \"Close all\""
          );
        }
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      setState('error');
      if (event.error === 'no-speech') {
        setErrorMsg('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Please allow microphone access.');
      } else {
        setErrorMsg(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If still in listening state (no result yet), transition to idle
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!parsed) return;

    try {
      if (parsed.action === 'buy' || parsed.action === 'sell') {
        const tick = parsed.symbol ? prices[parsed.symbol] : null;
        const fillPrice = tick ? (parsed.action === 'buy' ? tick.ask : tick.bid) : 0;

        if (!activeAccountId) {
          setFeedback('No active account selected');
          setState('idle');
          setParsed(null);
          return;
        }

        if (!fillPrice) {
          setFeedback(`No price available for ${parsed.symbol}`);
          setState('idle');
          setParsed(null);
          return;
        }

        await orderService.placeMarketOrder({
          accountId: activeAccountId,
          symbol: parsed.symbol!,
          direction: parsed.action.toUpperCase() as 'BUY' | 'SELL',
          size: parsed.size!,
          fillPrice,
          comment: 'Voice order',
        });
        setFeedback(`Order executed: ${parsed.displayText}`);
      } else if (parsed.action === 'close') {
        // Find the open position for this symbol and close it
        const positions = await orderService.getOpenPositions(activeAccountId!);
        const pos = positions?.find((p: Record<string, unknown>) => p.symbol === parsed.symbol);
        if (pos) {
          const tick = prices[parsed.symbol!];
          const closePrice = tick ? (pos.direction === 'BUY' ? tick.bid : tick.ask) : 0;
          await orderService.closePosition(pos.id as string, closePrice);
          setFeedback(`Closed ${parsed.symbol} position`);
        } else {
          setFeedback(`No open position found for ${parsed.symbol}`);
        }
      } else if (parsed.action === 'close_all') {
        const positions = await orderService.getOpenPositions(activeAccountId!);
        if (positions && positions.length > 0) {
          for (const pos of positions) {
            const tick = prices[(pos as Record<string, unknown>).symbol as string];
            const closePrice = tick ? ((pos as Record<string, unknown>).direction === 'BUY' ? tick.bid : tick.ask) : 0;
            await orderService.closePosition((pos as Record<string, unknown>).id as string, closePrice);
          }
          setFeedback(`Closed ${positions.length} positions`);
        } else {
          setFeedback('No open positions to close');
        }
      } else if (parsed.action === 'price') {
        const tick = parsed.symbol ? prices[parsed.symbol] : null;
        if (tick) {
          setFeedback(`${parsed.symbol}: Bid ${tick.bid.toFixed(5)} / Ask ${tick.ask.toFixed(5)}`);
        } else {
          setFeedback(`Price not available for ${parsed.symbol}`);
        }
      } else if (parsed.action === 'positions') {
        setFeedback('Showing open positions panel');
      }
    } catch (err) {
      setFeedback(`Error: ${err instanceof Error ? err.message : 'Order failed'}`);
    }

    setState('idle');
    setParsed(null);
    setTranscript('');
  }, [parsed, prices, activeAccountId]);

  const handleCancel = useCallback(() => {
    setState('idle');
    setParsed(null);
    setTranscript('');
    setFeedback('Command cancelled');
    stopListening();
  }, [stopListening]);

  // Lara multilingual capture: mic → 16kHz WAV → speech-to-text-translate
  // → ENGLISH transcript → the SAME parser + mandatory confirmation.
  const handleLaraMic = useCallback(async () => {
    if (sarvamCapRef.current) {
      setState('processing');
      try {
        const cap = sarvamCapRef.current;
        sarvamCapRef.current = null;
        const { base64, seconds } = await cap.stop();
        if (seconds < 1) { setState('error'); setErrorMsg('Recording too short — try again.'); return; }
        const res = await sarvamSpeech(base64);
        if (res.ok && res.transcript) {
          setTranscript(res.transcript);
          langAudit({ original: `[voice ${seconds}s]`, detected: res.language ?? 'unknown', engine: 'sarvam-stt-translate', translated: res.transcript.slice(0, 200), action: 'voice trading command' });
          const cmd = parseCommand(res.transcript);
          if (cmd) { setParsed(cmd); setState('confirming'); }
          else { setState('error'); setErrorMsg(`Heard “${res.transcript.slice(0, 60)}” — not a recognised command. Try: “Buy 0.1 EURUSD”.`); }
        } else {
          setState('error');
          setErrorMsg(`${res.error} — falling back to browser speech next time.`);
        }
      } catch {
        setState('error'); setErrorMsg('Voice capture failed.');
      }
      return;
    }
    try {
      setTranscript(''); setParsed(null); setErrorMsg(''); setFeedback('');
      sarvamCapRef.current = await startVoiceCapture();
      setState('listening');
    } catch {
      setState('error'); setErrorMsg('Microphone access denied.');
    }
  }, []);

  const handleMicClick = () => {
    if (sarvamReady) { void handleLaraMic(); return; }
    if (state === 'listening') {
      stopListening();
      setState('idle');
    } else {
      startListening();
    }
  };

  // Not supported fallback (Lara capture works in any browser with a mic)
  if (!supported && !sarvamReady) {
    return (
      <div
        className="w-72 rounded-lg border shadow-2xl p-4"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold">Voice Trading</span>
          <button onClick={onClose} className="opacity-40 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <MicOff size={24} className="opacity-30" />
          <p className="text-[11px] opacity-50">
            Voice trading is not available in this browser. Please use Chrome, Edge, or Safari for voice commands.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-72 rounded-lg border shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} style={{ color: '#0091D5' }} />
          <span className="text-[11px] font-bold">Voice Trading</span>
          <span className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold"
            title={sarvamReady ? 'Lara speech-to-text-translate: speak English or a supported Indian language — every command still needs your Confirm click' : 'Browser speech recognition (English). Enable Lara in EMIL’s Language & Voice panel for multilingual voice.'}
            style={{ color: sarvamReady ? '#FF8A65' : 'rgba(255,255,255,0.35)', border: `1px solid ${sarvamReady ? 'rgba(255,138,101,0.5)' : 'rgba(255,255,255,0.15)'}` }}>
            {sarvamReady ? 'LARA · multilingual' : 'browser · English'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="opacity-40 hover:opacity-70 transition-opacity"
        >
          <X size={13} />
        </button>
      </div>

      {/* Main content */}
      <div className="p-3">
        {/* Microphone button */}
        <div className="flex justify-center mb-3">
          <button
            onClick={handleMicClick}
            className="relative"
          >
            {/* Pulsing ring when listening */}
            {state === 'listening' && (
              <>
                <span
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ backgroundColor: '#0091D530' }}
                />
                <span
                  className="absolute -inset-1 rounded-full animate-pulse"
                  style={{ border: '2px solid #0091D540' }}
                />
              </>
            )}
            <div
              className={cn(
                'relative w-14 h-14 rounded-full flex items-center justify-center transition-all',
                state === 'listening' ? 'scale-110' : ''
              )}
              style={{
                backgroundColor:
                  state === 'listening'
                    ? '#0091D5'
                    : state === 'error'
                      ? '#FF174430'
                      : 'var(--bg-primary)',
                border: `2px solid ${state === 'listening' ? '#0091D5' : 'var(--border)'}`,
              }}
            >
              {state === 'listening' ? (
                <Mic size={22} color="#000" />
              ) : (
                <Mic size={22} className="opacity-50" />
              )}
            </div>
          </button>
        </div>

        {/* Waveform animation when listening */}
        {state === 'listening' && (
          <div className="flex items-end justify-center gap-0.5 h-6 mb-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full"
                style={{
                  backgroundColor: '#0091D5',
                  animation: `voiceWave 0.8s ease-in-out ${i * 0.07}s infinite alternate`,
                  height: 4,
                }}
              />
            ))}
          </div>
        )}

        {/* State text */}
        <div className="text-center mb-3">
          {state === 'idle' && !feedback && (
            <p className="text-[10px] opacity-40">
              Click the mic to start listening
            </p>
          )}
          {state === 'listening' && (
            <p className="text-[10px]" style={{ color: '#0091D5' }}>
              Listening...
            </p>
          )}
          {state === 'processing' && (
            <p className="text-[10px] opacity-60">Processing...</p>
          )}
        </div>

        {/* Transcript display */}
        {transcript && state !== 'confirming' && (
          <div
            className="text-[11px] px-2 py-1.5 rounded mb-3 font-mono text-center"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            &ldquo;{transcript}&rdquo;
          </div>
        )}

        {/* Error message */}
        {state === 'error' && errorMsg && (
          <div
            className="flex items-start gap-2 text-[10px] px-2 py-2 rounded mb-3"
            style={{
              backgroundColor: '#FF174415',
              color: '#FF1744',
              border: '1px solid #FF174430',
            }}
          >
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Confirmation dialog */}
        {state === 'confirming' && parsed && (
          <div className="mb-3">
            <div
              className="text-[10px] px-2 py-2 rounded mb-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="opacity-50 mb-1">I heard:</div>
              <div className="font-medium text-[11px]">{parsed.displayText}</div>
            </div>

            {/* Timer */}
            <div className="text-center text-[9px] opacity-40 mb-2">
              Auto-cancel in {confirmTimer}s
            </div>

            {/* Confirm/Cancel buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: '#00C853', color: '#000' }}
              >
                <Check size={12} />
                Confirm
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: '#FF1744', color: '#000' }}
              >
                <X size={12} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && state === 'idle' && (
          <div
            className="text-[10px] px-2 py-1.5 rounded text-center mb-2"
            style={{
              backgroundColor: '#0091D515',
              color: '#0091D5',
              border: '1px solid #0091D530',
            }}
          >
            {feedback}
          </div>
        )}

        {/* Command hints */}
        <div className="space-y-0.5 mt-2">
          <p className="text-[9px] opacity-30 uppercase font-bold mb-1">Commands</p>
          {[
            '"Buy 0.1 EURUSD"',
            '"Sell 0.5 Gold"',
            '"Close BTCUSD"',
            '"Close all"',
            '"What is EURUSD"',
            '"Show my positions"',
            ...(sarvamReady ? ['"गोल्ड 0.1 लॉट खरीदो" (any supported language)'] : []),
          ].map((cmd) => (
            <p key={cmd} className="text-[9px] opacity-30 font-mono">
              {cmd}
            </p>
          ))}
        </div>
      </div>

      {/* CSS for waveform animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voiceWave {
          from { height: 4px; }
          to { height: 20px; }
        }
      ` }} />
    </div>
  );
}
