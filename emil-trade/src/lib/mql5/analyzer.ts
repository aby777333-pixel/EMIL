// ═══════════════════════════════════════════════════════════
// EMIL TRADE — MQL5 Semantic Analyzer
// Analyzes AST to detect patterns, classify EAs, identify
// risk flags, and extract metadata for code generation
// ═══════════════════════════════════════════════════════════

import type {
  ASTNode,
  ProgramNode,
  InputDeclarationNode,
  FunctionDeclarationNode,
  CallExpressionNode,
  SemanticAnalysis,
  ScriptKind,
  EAClassification,
  RiskFlag,
  DetectedLifecycleHook,
  DetectedIndicatorBuffer,
  DetectedInputParam,
  DetectedOrderCall,
} from '@/types/converter';
import { MQL5_DATA_TYPES, MQL5_INDICATOR_FUNCTIONS, MQL5_LIFECYCLE_HOOKS, MQL5_ORDER_FUNCTIONS } from '@/types/converter';

const INDICATOR_NAME_MAP: Record<string, string> = {
  iMA: 'MovingAverage', iRSI: 'RSI', iMACD: 'MACD', iATR: 'ATR',
  iBands: 'BollingerBands', iStochastic: 'Stochastic', iCCI: 'CCI',
  iADX: 'ADX', iSAR: 'ParabolicSAR', iIchimoku: 'Ichimoku',
  iOBV: 'OBV', iMFI: 'MFI', iAD: 'AccumulationDistribution',
  iWPR: 'WilliamsPercentR', iMomentum: 'Momentum', iRVI: 'RVI',
  iBearsPower: 'BearsPower', iBullsPower: 'BullsPower',
  iDeMarker: 'DeMarker', iForce: 'ForceIndex', iOsMA: 'OsMA',
  iVolumes: 'Volumes', iAO: 'AwesomeOscillator', iAC: 'Accelerator',
  iAlligator: 'Alligator', iFractals: 'Fractals', iGator: 'Gator',
  iBWMFI: 'MarketFacilitationIndex', iEnvelopes: 'Envelopes',
  iStdDev: 'StandardDeviation', iDEMA: 'DEMA', iTEMA: 'TEMA',
  iFrAMA: 'FrAMA', iAMA: 'AMA', iVIDyA: 'VIDYA', iChaikin: 'Chaikin',
  iTRIX: 'TRIX',
};

export class MQL5Analyzer {
  private ast: ProgramNode;
  private allCalls: CallExpressionNode[];
  private allFunctions: FunctionDeclarationNode[];

  constructor(ast: ProgramNode) {
    this.ast = ast;
    this.allCalls = [];
    this.allFunctions = [];
    this.collectNodes(ast.body);
  }

  analyze(): SemanticAnalysis {
    const lifecycleHooks = this.detectLifecycleHooks();
    const scriptKind = this.detectScriptKind(lifecycleHooks);
    const inputParams = this.extractInputParams();
    const indicatorBuffers = this.detectIndicatorBuffers();
    const builtinIndicators = this.detectBuiltinIndicators();
    const orderCalls = this.detectOrderCalls();
    const riskFlags = this.detectRiskFlags(orderCalls, inputParams);
    const classification = this.classifyEA(orderCalls, builtinIndicators, inputParams);

    return {
      scriptKind,
      classification,
      riskFlags,
      lifecycleHooks,
      indicatorBuffers,
      inputParams,
      orderCalls,
      builtinIndicators: builtinIndicators.map(c => c),
      customIndicators: this.detectCustomIndicators(),
      tradingLogicPatterns: this.detectTradingPatterns(builtinIndicators, orderCalls),
      positionSizingMethod: this.detectPositionSizing(),
      riskManagementBlocks: this.detectRiskManagement(),
      hasMartingale: this.detectMartingale(),
      hasGridLogic: this.detectGrid(),
      hasNewsFilter: this.detectNewsFilter(),
      hasSessionFilter: this.detectSessionFilter(),
      hasTrailingStop: this.detectTrailingStop(),
      multiTimeframe: this.detectMultiTimeframe(),
      usesCustomClasses: this.ast.body.some(n => n.type === 'class_declaration'),
      complexity: this.assessComplexity(),
      dependsOn: this.detectDependencies(),
    };
  }

  private collectNodes(nodes: ASTNode[]): void {
    for (const node of nodes) {
      if (node.type === 'call_expression') {
        this.allCalls.push(node as CallExpressionNode);
      }
      if (node.type === 'function_declaration') {
        this.allFunctions.push(node as FunctionDeclarationNode);
      }
      // Recurse into all children
      for (const key of Object.keys(node)) {
        const val = (node as Record<string, unknown>)[key];
        if (Array.isArray(val)) {
          const childNodes = val.filter((v): v is ASTNode => v && typeof v === 'object' && 'type' in v);
          this.collectNodes(childNodes);
        } else if (val && typeof val === 'object' && 'type' in (val as object)) {
          this.collectNodes([val as ASTNode]);
        }
      }
    }
  }

  private detectLifecycleHooks(): DetectedLifecycleHook[] {
    const hooks: DetectedLifecycleHook[] = [];
    for (const fn of this.allFunctions) {
      const name = fn.name as DetectedLifecycleHook['name'];
      if ((MQL5_LIFECYCLE_HOOKS as readonly string[]).includes(name)) {
        hooks.push({
          name,
          line: fn.line,
          bodyLines: fn.body?.length ?? 0,
        });
      }
    }
    return hooks;
  }

  private detectScriptKind(hooks: DetectedLifecycleHook[]): ScriptKind {
    const hookNames = new Set(hooks.map(h => h.name));
    if (hookNames.has('OnCalculate')) return 'indicator';
    if (hookNames.has('OnTick')) return 'ea';
    const hasOrders = this.allCalls.some(c =>
      (MQL5_ORDER_FUNCTIONS as readonly string[]).includes(c.callee)
    );
    if (hasOrders) return 'ea';
    // Check for indicator properties
    const hasIndicatorProps = this.ast.preprocessorDirectives.some(
      d => d.value.includes('indicator_') || d.directive === 'property' && d.value.includes('indicator')
    );
    if (hasIndicatorProps) return 'indicator';
    return 'script';
  }

  private extractInputParams(): DetectedInputParam[] {
    return this.ast.body
      .filter((n): n is InputDeclarationNode => n.type === 'input_declaration')
      .map(n => ({
        name: n.name,
        type: n.dataType,
        defaultValue: n.defaultValue,
        description: n.comment || n.name,
        tsType: MQL5_DATA_TYPES[n.dataType] ?? 'string',
      }));
  }

  private detectIndicatorBuffers(): DetectedIndicatorBuffer[] {
    const buffers: DetectedIndicatorBuffer[] = [];
    const setBufferCalls = this.allCalls.filter(c => c.callee === 'SetIndexBuffer');

    for (const call of setBufferCalls) {
      const args = call.arguments;
      const index = args[0]?.type === 'literal' ? Number((args[0] as unknown as { value: unknown }).value) : buffers.length;
      const name = args[1]?.type === 'identifier' ? (args[1] as unknown as { name: string }).name : `Buffer${index}`;
      buffers.push({ index, name, style: 'line', color: '#00b4ff', label: name });
    }

    // Also check PlotIndexSetInteger for draw styles
    const plotCalls = this.allCalls.filter(c => c.callee === 'PlotIndexSetInteger');
    for (const call of plotCalls) {
      const args = call.arguments;
      if (args.length >= 3) {
        const bufIdx = args[0]?.type === 'literal' ? Number((args[0] as unknown as { value: unknown }).value) : 0;
        const buf = buffers.find(b => b.index === bufIdx);
        if (buf && args[1]?.type === 'identifier') {
          const prop = (args[1] as unknown as { name: string }).name;
          if (prop === 'PLOT_DRAW_TYPE' && args[2]?.type === 'identifier') {
            buf.style = (args[2] as unknown as { name: string }).name.replace('DRAW_', '').toLowerCase();
          }
        }
      }
    }

    return buffers;
  }

  private detectBuiltinIndicators(): string[] {
    const found = new Set<string>();
    for (const call of this.allCalls) {
      if ((MQL5_INDICATOR_FUNCTIONS as readonly string[]).includes(call.callee)) {
        found.add(call.callee);
      }
    }
    return Array.from(found);
  }

  private detectCustomIndicators(): string[] {
    return this.allCalls
      .filter(c => c.callee === 'iCustom')
      .map(c => {
        const nameArg = c.arguments[1]; // second arg is indicator name
        if (nameArg?.type === 'literal') {
          return String((nameArg as unknown as { value: unknown }).value).replace(/"/g, '');
        }
        return 'unknown_custom';
      });
  }

  private detectOrderCalls(): DetectedOrderCall[] {
    const calls: DetectedOrderCall[] = [];
    const orderFnNames = new Set(MQL5_ORDER_FUNCTIONS as readonly string[]);

    for (const call of this.allCalls) {
      if (!orderFnNames.has(call.callee)) continue;
      if (!['OrderSend', 'OrderModify', 'OrderClose', 'OrderDelete'].includes(call.callee)) continue;

      const args = call.arguments;
      let orderType = 'unknown';
      let hasStopLoss = false;
      let hasTakeProfit = false;
      let hasMagicNumber = false;

      if (call.callee === 'OrderSend') {
        // MQL4: OrderSend(symbol, type, lots, price, slippage, sl, tp, comment, magic, expiration, color)
        if (args.length >= 2 && args[1]?.type === 'identifier') {
          orderType = (args[1] as unknown as { name: string }).name;
        }
        // Check for SL (arg index 5) and TP (arg index 6)
        if (args.length >= 6) hasStopLoss = !this.isZeroOrEmpty(args[5]);
        if (args.length >= 7) hasTakeProfit = !this.isZeroOrEmpty(args[6]);
        if (args.length >= 8) hasMagicNumber = !this.isZeroOrEmpty(args[7]);
      }

      calls.push({
        function: call.callee,
        line: call.line,
        orderType,
        hasStopLoss,
        hasTakeProfit,
        hasMagicNumber,
      });
    }
    return calls;
  }

  private detectRiskFlags(orderCalls: DetectedOrderCall[], inputs: DetectedInputParam[]): RiskFlag[] {
    const flags: RiskFlag[] = [];

    // No stop loss detection
    const sendsWithoutSL = orderCalls.filter(c => c.function === 'OrderSend' && !c.hasStopLoss);
    if (sendsWithoutSL.length > 0) flags.push('no_stop_loss');

    // No take profit
    const sendsWithoutTP = orderCalls.filter(c => c.function === 'OrderSend' && !c.hasTakeProfit);
    if (sendsWithoutTP.length > 0) flags.push('no_take_profit');

    // Martingale detection
    if (this.detectMartingale()) flags.push('unlimited_martingale');

    // Grid without limits
    if (this.detectGrid()) {
      const hasGridLimit = inputs.some(i =>
        i.name.toLowerCase().includes('maxorders') ||
        i.name.toLowerCase().includes('max_orders') ||
        i.name.toLowerCase().includes('gridlimit')
      );
      if (!hasGridLimit) flags.push('grid_without_limits');
    }

    // High frequency (many order sends with small timeframe checks)
    if (orderCalls.length > 10) flags.push('high_frequency');

    // News dependent
    if (this.detectNewsFilter()) flags.push('news_dependent');

    return flags;
  }

  private classifyEA(
    orderCalls: DetectedOrderCall[],
    indicators: string[],
    inputs: DetectedInputParam[],
  ): EAClassification {
    const inputNames = inputs.map(i => i.name.toLowerCase());
    const codeText = JSON.stringify(this.ast).toLowerCase();

    if (this.detectMartingale()) return 'martingale';
    if (this.detectGrid()) return 'grid';

    // Arbitrage detection
    if (codeText.includes('arbitrage') || inputNames.some(n => n.includes('arbitrage'))) return 'arbitrage';

    // News-based
    if (this.detectNewsFilter() && inputNames.some(n => n.includes('news'))) return 'news_based';

    // Hedging
    if (inputNames.some(n => n.includes('hedge')) || codeText.includes('hedge')) return 'hedging';

    // Breakout
    if (inputNames.some(n => n.includes('breakout')) || codeText.includes('breakout')) return 'breakout';

    // Scalping
    if (inputNames.some(n => n.includes('scalp')) || codeText.includes('scalp')) return 'scalping';

    // Mean reversion
    if (indicators.includes('iBands') || indicators.includes('iRSI')) {
      if (inputNames.some(n => n.includes('overbought') || n.includes('oversold'))) return 'mean_reversion';
    }

    // Range trading
    if (inputNames.some(n => n.includes('range'))) return 'range_trading';

    // Trend following (most common)
    const trendIndicators = ['iMA', 'iMACD', 'iADX', 'iSAR', 'iIchimoku'];
    if (indicators.some(i => trendIndicators.includes(i))) return 'trend_following';

    return 'custom';
  }

  private detectTradingPatterns(indicators: string[], orderCalls: DetectedOrderCall[]): string[] {
    const patterns: string[] = [];
    if (indicators.includes('iMA') && indicators.length >= 2) patterns.push('moving_average_crossover');
    if (indicators.includes('iRSI')) patterns.push('rsi_levels');
    if (indicators.includes('iMACD')) patterns.push('macd_signal');
    if (indicators.includes('iBands')) patterns.push('bollinger_band_squeeze');
    if (indicators.includes('iStochastic')) patterns.push('stochastic_cross');
    if (indicators.includes('iADX')) patterns.push('adx_trend_strength');
    if (this.detectTrailingStop()) patterns.push('trailing_stop');
    if (orderCalls.length > 0) patterns.push('direct_market_orders');
    return patterns;
  }

  private detectPositionSizing(): string {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    if (codeText.includes('accountbalance') && codeText.includes('risk')) return 'risk_percent_balance';
    if (codeText.includes('accountequity') && codeText.includes('risk')) return 'risk_percent_equity';
    if (codeText.includes('lotsize') || codeText.includes('fixedlot')) return 'fixed_lot';
    return 'fixed_lot';
  }

  private detectRiskManagement(): string[] {
    const blocks: string[] = [];
    if (this.detectTrailingStop()) blocks.push('trailing_stop');
    const hasBreakeven = this.allCalls.some(c => c.callee === 'OrderModify');
    if (hasBreakeven) blocks.push('breakeven_adjustment');
    const codeText = JSON.stringify(this.ast).toLowerCase();
    if (codeText.includes('maxdrawdown') || codeText.includes('max_drawdown')) blocks.push('max_drawdown_limit');
    if (codeText.includes('maxloss') || codeText.includes('dailyloss')) blocks.push('daily_loss_limit');
    return blocks;
  }

  private detectMartingale(): boolean {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    return codeText.includes('martingale') ||
      (codeText.includes('lotmultiplier') || codeText.includes('lot_multiplier') || codeText.includes('lotfactor'));
  }

  private detectGrid(): boolean {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    return codeText.includes('gridstep') || codeText.includes('grid_step') ||
      codeText.includes('griddistance') || codeText.includes('grid');
  }

  private detectNewsFilter(): boolean {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    return codeText.includes('newsfilter') || codeText.includes('news_filter') ||
      codeText.includes('economic_calendar') || codeText.includes('isnewstime');
  }

  private detectSessionFilter(): boolean {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    return codeText.includes('tradinghours') || codeText.includes('trading_hours') ||
      codeText.includes('sessionstart') || codeText.includes('session_start') ||
      codeText.includes('timefilter') || codeText.includes('allowedtime');
  }

  private detectTrailingStop(): boolean {
    const codeText = JSON.stringify(this.ast).toLowerCase();
    return codeText.includes('trailingstop') || codeText.includes('trailing_stop') ||
      codeText.includes('trailstart') || codeText.includes('trail_start');
  }

  private detectMultiTimeframe(): boolean {
    // Check for indicator calls with explicit timeframe parameter different from PERIOD_CURRENT
    for (const call of this.allCalls) {
      if ((MQL5_INDICATOR_FUNCTIONS as readonly string[]).includes(call.callee) && call.arguments.length >= 2) {
        const tfArg = call.arguments[1]; // typically second arg is timeframe
        if (tfArg?.type === 'identifier') {
          const name = (tfArg as unknown as { name: string }).name;
          if (name !== 'PERIOD_CURRENT' && name.startsWith('PERIOD_')) return true;
        }
      }
    }
    return false;
  }

  private detectDependencies(): string[] {
    const deps: string[] = [];
    for (const dir of this.ast.preprocessorDirectives) {
      if (dir.directive === 'include') {
        deps.push(dir.value.replace(/[<>"]/g, '').trim());
      }
    }
    return deps;
  }

  private assessComplexity(): SemanticAnalysis['complexity'] {
    const totalNodes = this.countNodes(this.ast.body);
    const funcCount = this.allFunctions.length;
    const hasClasses = this.ast.body.some(n => n.type === 'class_declaration');

    if (hasClasses || totalNodes > 500 || funcCount > 20) return 'advanced';
    if (totalNodes > 200 || funcCount > 10) return 'complex';
    if (totalNodes > 50 || funcCount > 5) return 'moderate';
    return 'simple';
  }

  private countNodes(nodes: ASTNode[]): number {
    let count = nodes.length;
    for (const node of nodes) {
      for (const key of Object.keys(node)) {
        const val = (node as Record<string, unknown>)[key];
        if (Array.isArray(val)) {
          const children = val.filter((v): v is ASTNode => v && typeof v === 'object' && 'type' in v);
          count += this.countNodes(children);
        }
      }
    }
    return count;
  }

  private isZeroOrEmpty(node: ASTNode | undefined): boolean {
    if (!node) return true;
    if (node.type === 'literal') {
      const val = (node as unknown as { value: unknown }).value;
      return val === 0 || val === null || val === '' || val === '0' || val === '0.0';
    }
    return false;
  }
}
