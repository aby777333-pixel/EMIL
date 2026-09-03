// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Module 0: EA & Indicator Conversion Engine
// TypeScript Type Definitions
// ═══════════════════════════════════════════════════════════

// ─── MQL5 Token Types ───────────────────────────────────────
export type MQL5TokenType =
  | 'keyword' | 'identifier' | 'number' | 'string' | 'operator'
  | 'punctuation' | 'preprocessor' | 'comment' | 'type' | 'builtin'
  | 'enum_value' | 'eof' | 'whitespace';

export interface MQL5Token {
  type: MQL5TokenType;
  value: string;
  line: number;
  column: number;
  offset: number;
}

// ─── MQL5 AST Node Types ────────────────────────────────────
export type ASTNodeType =
  | 'program' | 'preprocessor_directive' | 'input_declaration'
  | 'variable_declaration' | 'function_declaration' | 'class_declaration'
  | 'struct_declaration' | 'enum_declaration' | 'block_statement'
  | 'if_statement' | 'for_statement' | 'while_statement' | 'switch_statement'
  | 'case_clause' | 'return_statement' | 'expression_statement'
  | 'assignment_expression' | 'binary_expression' | 'unary_expression'
  | 'call_expression' | 'member_expression' | 'index_expression'
  | 'conditional_expression' | 'identifier' | 'literal' | 'array_literal'
  | 'parameter' | 'break_statement' | 'continue_statement';

export interface ASTNode {
  type: ASTNodeType;
  line: number;
  column: number;
  children?: ASTNode[];
  [key: string]: unknown;
}

export interface ProgramNode extends ASTNode {
  type: 'program';
  body: ASTNode[];
  preprocessorDirectives: PreprocessorNode[];
}

export interface PreprocessorNode extends ASTNode {
  type: 'preprocessor_directive';
  directive: string;
  value: string;
}

export interface InputDeclarationNode extends ASTNode {
  type: 'input_declaration';
  dataType: string;
  name: string;
  defaultValue: string | number | boolean | null;
  comment: string;
}

export interface FunctionDeclarationNode extends ASTNode {
  type: 'function_declaration';
  returnType: string;
  name: string;
  params: ParameterNode[];
  body: ASTNode[];
}

export interface ParameterNode extends ASTNode {
  type: 'parameter';
  dataType: string;
  name: string;
  defaultValue?: string | number | boolean | null;
}

export interface VariableDeclarationNode extends ASTNode {
  type: 'variable_declaration';
  dataType: string;
  name: string;
  initializer?: ASTNode;
  isStatic: boolean;
  isConst: boolean;
}

export interface CallExpressionNode extends ASTNode {
  type: 'call_expression';
  callee: string;
  arguments: ASTNode[];
}

export interface BinaryExpressionNode extends ASTNode {
  type: 'binary_expression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface IfStatementNode extends ASTNode {
  type: 'if_statement';
  condition: ASTNode;
  consequent: ASTNode[];
  alternate?: ASTNode[];
}

export interface ForStatementNode extends ASTNode {
  type: 'for_statement';
  init: ASTNode | null;
  test: ASTNode | null;
  update: ASTNode | null;
  body: ASTNode[];
}

export interface ReturnStatementNode extends ASTNode {
  type: 'return_statement';
  argument: ASTNode | null;
}

export interface LiteralNode extends ASTNode {
  type: 'literal';
  value: string | number | boolean | null;
  raw: string;
}

export interface IdentifierNode extends ASTNode {
  type: 'identifier';
  name: string;
}

export interface MemberExpressionNode extends ASTNode {
  type: 'member_expression';
  object: ASTNode;
  property: string;
}

export interface AssignmentExpressionNode extends ASTNode {
  type: 'assignment_expression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

// ─── Semantic Analysis Types ────────────────────────────────

export type ScriptKind = 'ea' | 'indicator' | 'script' | 'library';

export type EAClassification =
  | 'trend_following' | 'mean_reversion' | 'scalping' | 'grid'
  | 'martingale' | 'arbitrage' | 'news_based' | 'breakout'
  | 'range_trading' | 'hedging' | 'custom';

export type RiskFlag =
  | 'no_stop_loss' | 'unlimited_martingale' | 'excessive_leverage'
  | 'no_take_profit' | 'grid_without_limits' | 'high_frequency'
  | 'cross_pair_dependency' | 'news_dependent';

export interface DetectedLifecycleHook {
  name: 'OnInit' | 'OnDeinit' | 'OnTick' | 'OnCalculate' | 'OnTimer' | 'OnChartEvent' | 'OnTester';
  line: number;
  bodyLines: number;
}

export interface DetectedIndicatorBuffer {
  index: number;
  name: string;
  style: string;
  color: string;
  label: string;
}

export interface DetectedInputParam {
  name: string;
  type: string;
  defaultValue: string | number | boolean | null;
  description: string;
  tsType: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface DetectedOrderCall {
  function: string;
  line: number;
  orderType: string;
  hasStopLoss: boolean;
  hasTakeProfit: boolean;
  hasMagicNumber: boolean;
}

export interface SemanticAnalysis {
  scriptKind: ScriptKind;
  classification: EAClassification;
  riskFlags: RiskFlag[];
  lifecycleHooks: DetectedLifecycleHook[];
  indicatorBuffers: DetectedIndicatorBuffer[];
  inputParams: DetectedInputParam[];
  orderCalls: DetectedOrderCall[];
  builtinIndicators: string[];
  customIndicators: string[];
  tradingLogicPatterns: string[];
  positionSizingMethod: string;
  riskManagementBlocks: string[];
  hasMartingale: boolean;
  hasGridLogic: boolean;
  hasNewsFilter: boolean;
  hasSessionFilter: boolean;
  hasTrailingStop: boolean;
  multiTimeframe: boolean;
  usesCustomClasses: boolean;
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  dependsOn: string[];
}

// ─── Built-in Indicator Mapping ─────────────────────────────

export interface IndicatorMapping {
  mql5Name: string;
  raptorName: string;
  category: 'moving_average' | 'oscillator' | 'trend' | 'volatility' | 'volume' | 'custom';
  params: { mql5: string; raptor: string; type: string }[];
  pineScriptEquivalent: string;
}

// ─── Code Generation Types ──────────────────────────────────

export interface GeneratedOutput {
  typescript: string;
  pineScript: string;
  configComponent: string;
  zodSchema: string;
  testScaffold: string;
  deploymentManifest: DeploymentManifest;
  documentation: string;
  readme: string;
}

export interface DeploymentManifest {
  name: string;
  version: string;
  kind: ScriptKind;
  classification: EAClassification;
  riskFlags: RiskFlag[];
  requiredPermissions: string[];
  resourceLimits: {
    maxCpuMs: number;
    maxMemoryMb: number;
    maxApiCallsPerMinute: number;
  };
  supportedInstruments: string[];
  supportedTimeframes: string[];
  requiresBrokerApproval: boolean;
}

// ─── Conversion Pipeline Types ──────────────────────────────

export type ConversionStage =
  | 'queued' | 'parsing' | 'analyzing' | 'converting'
  | 'testing' | 'ready' | 'failed' | 'deployed';

export interface ConversionFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: 'mq5' | 'ex5';
  originalCode: string;
  stage: ConversionStage;
  progress: number;
  confidenceScore: number;
  semanticAnalysis: SemanticAnalysis | null;
  generatedOutput: GeneratedOutput | null;
  errors: ConversionError[];
  warnings: ConversionWarning[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversionError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'fatal';
}

export interface ConversionWarning {
  code: string;
  message: string;
  line?: number;
  suggestion: string;
  severity: 'warning' | 'info';
}

export interface ConversionJob {
  id: string;
  userId: string;
  brokerId: string | null;
  files: ConversionFile[];
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  status: 'processing' | 'completed' | 'partial' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// ─── Deployment Types ───────────────────────────────────────

export type DeploymentScope = 'live' | 'demo' | 'paper';
export type DeploymentTarget = 'platform_wide' | 'account_group' | 'single_account';

export interface ScriptDeployment {
  id: string;
  scriptId: string;
  scope: DeploymentScope;
  target: DeploymentTarget;
  targetIds: string[];
  version: number;
  isActive: boolean;
  deployedBy: string;
  deployedAt: string;
  performanceStats: ScriptPerformanceStats | null;
}

export interface ScriptPerformanceStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netPnl: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgTradeReturn: number;
  avgHoldTime: string;
  activeSince: string;
  accountsRunning: number;
}

// ─── Marketplace Types ──────────────────────────────────────

export type MarketplaceMonetization = 'free' | 'one_time' | 'monthly' | 'revenue_share';

export interface MarketplaceListing {
  id: string;
  scriptId: string;
  name: string;
  description: string;
  shortDescription: string;
  category: ScriptKind;
  classification: EAClassification;
  monetization: MarketplaceMonetization;
  price: number | null;
  revenueSharePct: number | null;
  authorId: string;
  authorName: string;
  isVerified: boolean;
  verifiedAt: string | null;
  rating: number;
  reviewCount: number;
  installCount: number;
  activeUsers: number;
  performanceStats: ScriptPerformanceStats | null;
  screenshots: string[];
  tags: string[];
  versions: MarketplaceVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceVersion {
  version: number;
  changelog: string;
  releaseDate: string;
  downloadCount: number;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

// ─── Script Runtime Types ───────────────────────────────────

export interface ScriptInstance {
  id: string;
  scriptId: string;
  accountId: string;
  status: 'running' | 'paused' | 'stopped' | 'error';
  parameters: Record<string, string | number | boolean>;
  instrument: string;
  timeframe: string;
  startedAt: string;
  lastTickAt: string | null;
  errorMessage: string | null;
  performanceStats: ScriptPerformanceStats | null;
}

// ─── MQL5 Built-in Function Categories ──────────────────────

export const MQL5_LIFECYCLE_HOOKS = [
  'OnInit', 'OnDeinit', 'OnTick', 'OnCalculate', 'OnTimer',
  'OnChartEvent', 'OnTester', 'OnTesterInit', 'OnTesterDeinit',
  'OnTesterPass', 'OnBookEvent', 'OnTradeTransaction',
] as const;

export const MQL5_ORDER_FUNCTIONS = [
  'OrderSend', 'OrderModify', 'OrderClose', 'OrderDelete',
  'OrderCloseBy', 'OrderSelect', 'OrdersTotal', 'OrderTicket',
  'OrderType', 'OrderLots', 'OrderOpenPrice', 'OrderClosePrice',
  'OrderStopLoss', 'OrderTakeProfit', 'OrderMagicNumber',
  'OrderComment', 'OrderSymbol', 'OrderProfit', 'OrderSwap',
  'OrderCommission', 'OrderOpenTime', 'OrderCloseTime',
  'OrderExpiration', 'PositionSelect', 'PositionGetDouble',
  'PositionGetInteger', 'PositionGetString', 'PositionGetTicket',
  'PositionsTotal', 'HistorySelect', 'HistoryOrderSelect',
  'HistoryDealSelect', 'HistoryOrdersTotal', 'HistoryDealsTotal',
] as const;

export const MQL5_INDICATOR_FUNCTIONS = [
  'iMA', 'iRSI', 'iMACD', 'iATR', 'iBands', 'iStochastic',
  'iCCI', 'iADX', 'iSAR', 'iIchimoku', 'iOBV', 'iMFI',
  'iAD', 'iWPR', 'iMomentum', 'iRVI', 'iBearsPower', 'iBullsPower',
  'iDeMarker', 'iForce', 'iOsMA', 'iVolumes', 'iCustom',
  'iAO', 'iAC', 'iAlligator', 'iFractals', 'iGator',
  'iBWMFI', 'iEnvelopes', 'iStdDev', 'iDEMA', 'iTEMA',
  'iFrAMA', 'iAMA', 'iVIDyA', 'iChaikin', 'iTRIX',
] as const;

export const MQL5_DATA_TYPES: Record<string, string> = {
  'int': 'number',
  'uint': 'number',
  'long': 'number',
  'ulong': 'number',
  'short': 'number',
  'ushort': 'number',
  'char': 'number',
  'uchar': 'number',
  'double': 'number',
  'float': 'number',
  'bool': 'boolean',
  'string': 'string',
  'datetime': 'number',
  'color': 'string',
  'void': 'void',
  'ENUM_TIMEFRAMES': 'string',
  'ENUM_MA_METHOD': 'string',
  'ENUM_APPLIED_PRICE': 'string',
  'ENUM_ORDER_TYPE': 'string',
  'ENUM_TRADE_REQUEST_ACTIONS': 'string',
  'ENUM_POSITION_TYPE': 'string',
  'ENUM_DEAL_TYPE': 'string',
};

export const MQL5_KEYWORDS = new Set([
  'input', 'sinput', 'static', 'const', 'extern', 'export',
  'virtual', 'override', 'class', 'struct', 'enum', 'union',
  'template', 'typename', 'namespace', 'using', 'typedef',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'default', 'break', 'continue', 'return', 'new', 'delete',
  'true', 'false', 'NULL', 'this', 'sizeof', 'operator',
  'private', 'protected', 'public', 'void', 'int', 'uint',
  'long', 'ulong', 'short', 'ushort', 'char', 'uchar',
  'double', 'float', 'bool', 'string', 'datetime', 'color',
]);
