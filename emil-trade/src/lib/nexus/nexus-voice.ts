// ═══════════════════════════════════════════════════════════
// EMIL TRADE — NEXUS Voice Layer Engine
// Superprompt Section 7: Voice is for moments that matter
// Priority-based, state-aware, anti-annoyance voice output
// ═══════════════════════════════════════════════════════════

import type {
  NexusVoiceConfig, NexusVoiceMessage, NexusVoiceMode, NexusVoicePriority,
} from '@/types/nexus';

// ─── Voice Script Library (Section 7.4) ──────────────────

const VOICE_SCRIPTS: Record<NexusVoiceMessage['category'], string[]> = {
  idle: [
    'No clean setup right now.',
    'Market is quiet. Wait.',
  ],
  entry_good: [
    'Clean entry. Keep risk tight.',
    'Structure supports this.',
  ],
  entry_late: [
    "You're chasing. Wait for pullback.",
    'Price stretched. Be careful.',
  ],
  entry_risky: [
    'High risk here. Reduce size.',
    'Not a stable move.',
  ],
  running_neutral: [
    'Holding. Structure intact.',
    'Momentum slowing. Watch closely.',
  ],
  profit_zone: [
    "Good move. Don't rush.",
    'Approaching resistance. Consider partial exit.',
    'Lock partial profit.',
  ],
  loss_danger: [
    'Watch your position.',       // Level 1
    'Pressure building.',         // Level 2
    'Reduce now.',                // Level 3
    'Exit.',                      // Level 4 (P1 Critical)
  ],
  critical_event: [
    'Volatility spike. Stay sharp.',
    'Margin level critical.',
    'Daily loss limit reached. Trading paused.',
  ],
  auto_trade: [
    'AI opened a trade.',
    'Reducing position.',
    'Trade closed in profit.',
    'Trade closed in loss.',
  ],
  behavioral: [
    "You're increasing size after losses.",
    'Three trades in 20 minutes. Slow down.',
    'You trade better when you wait.',
  ],
};

// ─── Priority Timing (Section 7.5) ──────────────────────

const PRIORITY_CONFIG: Record<NexusVoicePriority, { cooldownMs: number; allowInMode: NexusVoiceMode[] }> = {
  P1: { cooldownMs: 5000, allowInMode: ['assistive', 'active_guidance', 'full_voice'] },
  P2: { cooldownMs: 10000, allowInMode: ['active_guidance', 'full_voice'] },
  P3: { cooldownMs: 20000, allowInMode: ['full_voice'] },
};

// ─── Voice Engine State ────────────────────────────────────

interface VoiceEngineState {
  lastSpokenAt: number;
  lastPriority: NexusVoicePriority | null;
  lastCategory: NexusVoiceMessage['category'] | null;
  messageQueue: NexusVoiceMessage[];
  escalationLevel: Record<string, number>; // per-category escalation tracking
}

const engineState: VoiceEngineState = {
  lastSpokenAt: 0,
  lastPriority: null,
  lastCategory: null,
  messageQueue: [],
  escalationLevel: {},
};

/**
 * Get a voice script line for a category with escalation support
 */
export function getVoiceLine(category: NexusVoiceMessage['category']): string {
  const scripts = VOICE_SCRIPTS[category];
  if (!scripts || scripts.length === 0) return '';

  // For loss_danger, use escalation level
  if (category === 'loss_danger') {
    const level = Math.min(engineState.escalationLevel[category] ?? 0, scripts.length - 1);
    return scripts[level];
  }

  // For others, random selection
  return scripts[Math.floor(Math.random() * scripts.length)];
}

/**
 * Escalate a category (e.g., loss_danger goes from level 1 to 4)
 */
export function escalateCategory(category: NexusVoiceMessage['category']): void {
  const current = engineState.escalationLevel[category] ?? 0;
  const maxLevel = (VOICE_SCRIPTS[category]?.length ?? 1) - 1;
  engineState.escalationLevel[category] = Math.min(current + 1, maxLevel);
}

/**
 * Reset escalation for a category (e.g., situation improved)
 */
export function resetEscalation(category: NexusVoiceMessage['category']): void {
  engineState.escalationLevel[category] = 0;
}

/**
 * Check if a voice message should be spoken based on config and state
 */
export function shouldSpeak(
  message: NexusVoiceMessage,
  config: NexusVoiceConfig,
): boolean {
  // Silent mode: never speak
  if (config.mode === 'silent') return false;

  // Check if priority is allowed in current mode
  const priorityConfig = PRIORITY_CONFIG[message.priority];
  if (!priorityConfig.allowInMode.includes(config.mode)) return false;

  // Cooldown check — don't repeat too quickly
  const now = Date.now();
  const timeSinceLast = now - engineState.lastSpokenAt;
  if (timeSinceLast < priorityConfig.cooldownMs) {
    // Exception: P1 can interrupt P2/P3
    if (message.priority !== 'P1') return false;
    if (engineState.lastPriority === 'P1' && timeSinceLast < PRIORITY_CONFIG.P1.cooldownMs) return false;
  }

  // Anti-annoyance: don't repeat same category without state change
  if (message.category === engineState.lastCategory && timeSinceLast < priorityConfig.cooldownMs * 2) {
    return false;
  }

  return true;
}

/**
 * Speak a NEXUS voice message using Web Speech API
 * Returns true if spoken, false if skipped
 */
export function speakNexusMessage(
  message: NexusVoiceMessage,
  config: NexusVoiceConfig,
): boolean {
  if (!shouldSpeak(message, config)) return false;

  // Use browser's speech synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.rate = config.personality === 'minimal' ? 1.2 : config.personality === 'sharp_trader' ? 1.1 : 1.0;
    utterance.volume = config.volume;
    utterance.lang = config.language;

    // Cancel any current speech (P1 interrupts)
    if (message.priority === 'P1') {
      window.speechSynthesis.cancel();
    }

    window.speechSynthesis.speak(utterance);
  }

  // Update engine state
  engineState.lastSpokenAt = Date.now();
  engineState.lastPriority = message.priority;
  engineState.lastCategory = message.category;

  return true;
}

/**
 * Create a voice message from a category and priority
 */
export function createVoiceMessage(
  category: NexusVoiceMessage['category'],
  priority: NexusVoicePriority,
): NexusVoiceMessage {
  return {
    text: getVoiceLine(category),
    priority,
    category,
    cooldownMs: PRIORITY_CONFIG[priority].cooldownMs,
  };
}

/**
 * Get the default voice configuration
 */
export function getDefaultVoiceConfig(): NexusVoiceConfig {
  return {
    mode: 'silent', // Safe default — user must explicitly enable
    personality: 'calm_analyst',
    language: 'en-US',
    volume: 0.7,
  };
}
