// ═══════════════════════════════════════════════════════════
// EMIL TRADE — EA Base Class
// Runtime base for all converted Expert Advisors
// ═══════════════════════════════════════════════════════════

export interface Tick {
  bid: number;
  ask: number;
  time: number;
  volume: number;
}

export interface Position {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  openPrice: number;
  currentPrice: number;
  volume: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  swap: number;
  commission: number;
  strategyId: string;
  openTime: number;
}

export interface AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  profit: number;
  leverage: number;
  currency: string;
}

export interface OrderRequest {
  symbol: string;
  type: 'market_buy' | 'market_sell' | 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop';
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
  strategyId: string;
  expiration?: number;
}

export abstract class GioRaptorEA<TParams extends Record<string, unknown> = Record<string, unknown>> {
  protected params: TParams;
  protected symbol: string = 'EURUSD';
  protected timeframe: string = 'H1';
  protected strategyId: string = '';
  protected point: number = 0.00001;
  protected digits: number = 5;
  private _indicatorHandles: Map<string, number> = new Map();
  private _handleCounter: number = 0;

  constructor(params: TParams) {
    this.params = params;
    this.strategyId = this.constructor.name;
  }

  abstract onTick(tick: Tick): Promise<void>;

  async onInit(): Promise<void> {
    // Override in subclass
  }

  onDeinit(): void {
    // Override in subclass
  }

  protected log(message: string): void {
    console.log(`[${this.strategyId}] ${message}`);
  }

  protected async createIndicator(name: string, _params: unknown): Promise<number> {
    const handle = ++this._handleCounter;
    this._indicatorHandles.set(`${name}_${handle}`, handle);
    return handle;
  }

  protected async getIndicatorValue(_handle: number, _shift: number): Promise<number> {
    return 0; // Implemented by runtime bridge
  }

  protected async getPositions(): Promise<Position[]> {
    return []; // Implemented by runtime bridge
  }

  protected async getAccountInfo(): Promise<AccountInfo> {
    return {
      balance: 10000, equity: 10000, margin: 0, freeMargin: 10000,
      marginLevel: 0, profit: 0, leverage: 100, currency: 'USD',
    };
  }

  protected async sendOrder(request: OrderRequest): Promise<string> {
    this.log(`Order: ${request.type} ${request.volume} ${request.symbol}`);
    return crypto.randomUUID();
  }

  protected async modifyPosition(_positionId: string, _changes: Partial<{ stopLoss: number; takeProfit: number }>): Promise<boolean> {
    return true;
  }

  protected async closePosition(_positionId: string): Promise<boolean> {
    return true;
  }
}
