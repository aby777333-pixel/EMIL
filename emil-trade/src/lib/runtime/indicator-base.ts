// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Indicator Base Class
// Runtime base for all converted Custom Indicators
// ═══════════════════════════════════════════════════════════

export interface Bar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

interface BufferConfig {
  style: string;
  color: string;
  label: string;
}

export abstract class GioRaptorIndicator<TParams extends Record<string, unknown> = Record<string, unknown>> {
  protected params: TParams;
  protected buffers: Map<string, number[]> = new Map();
  private bufferConfigs: Map<string, BufferConfig> = new Map();

  constructor(params: TParams) {
    this.params = params;
  }

  abstract onCalculate(bars: Bar[], prevCalculated: number): number;

  async onInit(): Promise<void> {
    // Override in subclass
  }

  onDeinit(): void {
    // Override in subclass
  }

  protected registerBuffer(name: string, config: BufferConfig): void {
    this.buffers.set(name, []);
    this.bufferConfigs.set(name, config);
  }

  protected getBuffer(name: string): number[] {
    let buf = this.buffers.get(name);
    if (!buf) {
      buf = [];
      this.buffers.set(name, buf);
    }
    return buf;
  }

  getBufferConfigs(): Map<string, BufferConfig> {
    return this.bufferConfigs;
  }

  getAllBufferData(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [name, data] of this.buffers) {
      result[name] = data;
    }
    return result;
  }

  protected async createIndicator(_name: string, _params: unknown): Promise<number> {
    return 0;
  }

  protected async getIndicatorValue(_handle: number, _shift: number): Promise<number> {
    return 0;
  }

  protected log(message: string): void {
    console.log(`[${this.constructor.name}] ${message}`);
  }
}
