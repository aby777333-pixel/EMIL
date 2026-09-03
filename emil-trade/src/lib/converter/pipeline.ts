// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Conversion Pipeline Orchestrator
// Manages the full MQL5 → EMIL TRADE conversion flow
// ═══════════════════════════════════════════════════════════

import { MQL5Lexer } from '@/lib/mql5/lexer';
import { MQL5Parser } from '@/lib/mql5/parser';
import { MQL5Analyzer } from '@/lib/mql5/analyzer';
import { CodeGenerator } from '@/lib/converter/generator';
import type {
  ConversionFile,
  ConversionStage,
  ConversionError,
  ConversionWarning,
  SemanticAnalysis,
  GeneratedOutput,
} from '@/types/converter';

type StageCallback = (fileId: string, stage: ConversionStage, progress: number) => void;

interface PipelineResult {
  file: ConversionFile;
  success: boolean;
}

export class ConversionPipeline {
  private onProgress?: StageCallback;

  constructor(onProgress?: StageCallback) {
    this.onProgress = onProgress;
  }

  async processFile(fileId: string, fileName: string, sourceCode: string): Promise<PipelineResult> {
    const file: ConversionFile = {
      id: fileId,
      fileName,
      fileSize: new Blob([sourceCode]).size,
      fileType: fileName.endsWith('.ex5') ? 'ex5' : 'mq5',
      originalCode: sourceCode,
      stage: 'queued',
      progress: 0,
      confidenceScore: 0,
      semanticAnalysis: null,
      generatedOutput: null,
      errors: [],
      warnings: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (file.fileType === 'ex5') {
      file.errors.push({
        code: 'EX5_BINARY',
        message: 'Compiled .ex5 files cannot be decompiled. Please upload the original .mq5 source file.',
        severity: 'fatal',
      });
      file.stage = 'failed';
      return { file, success: false };
    }

    try {
      // Stage 1: Parsing
      this.updateProgress(file, 'parsing', 10);
      const { tokens, parseErrors } = this.stage1Parse(sourceCode);
      if (parseErrors.length > 0) {
        file.warnings.push(...parseErrors.map(e => ({
          code: 'PARSE_WARNING',
          message: e.message,
          line: e.line,
          suggestion: 'Review the original MQL5 code for syntax issues',
          severity: 'warning' as const,
        })));
      }
      this.updateProgress(file, 'parsing', 25);

      // Stage 2: Semantic Analysis
      this.updateProgress(file, 'analyzing', 30);
      const analysis = this.stage2Analyze(tokens);
      file.semanticAnalysis = analysis;
      this.updateProgress(file, 'analyzing', 50);

      // Generate risk warnings
      if (analysis.riskFlags.length > 0) {
        for (const flag of analysis.riskFlags) {
          file.warnings.push({
            code: `RISK_${flag.toUpperCase()}`,
            message: this.getRiskFlagMessage(flag),
            suggestion: this.getRiskFlagSuggestion(flag),
            severity: 'warning',
          });
        }
      }

      // Stage 3: Code Generation
      this.updateProgress(file, 'converting', 55);
      const generated = this.stage3Generate(analysis, tokens.ast, fileName);
      file.generatedOutput = generated;
      this.updateProgress(file, 'converting', 80);

      // Stage 4: Testing (signal parity check placeholder)
      this.updateProgress(file, 'testing', 85);
      const confidence = this.stage4Test(analysis, generated);
      file.confidenceScore = confidence;
      this.updateProgress(file, 'testing', 95);

      // Ready
      file.stage = 'ready';
      file.progress = 100;
      this.onProgress?.(file.id, 'ready', 100);

      return { file, success: true };
    } catch (err) {
      file.errors.push({
        code: 'PIPELINE_ERROR',
        message: err instanceof Error ? err.message : 'Unknown conversion error',
        severity: 'error',
      });
      file.stage = 'failed';
      this.onProgress?.(file.id, 'failed', file.progress);
      return { file, success: false };
    }
  }

  private stage1Parse(sourceCode: string): {
    tokens: { ast: ReturnType<MQL5Parser['parse']>['ast']; rawTokens: ReturnType<MQL5Lexer['tokenize']> };
    parseErrors: { message: string; line: number }[];
  } {
    const lexer = new MQL5Lexer(sourceCode);
    const rawTokens = lexer.tokenize();
    const parser = new MQL5Parser(rawTokens);
    const { ast, errors } = parser.parse();
    return {
      tokens: { ast, rawTokens },
      parseErrors: errors,
    };
  }

  private stage2Analyze(tokens: { ast: ReturnType<MQL5Parser['parse']>['ast'] }): SemanticAnalysis {
    const analyzer = new MQL5Analyzer(tokens.ast);
    return analyzer.analyze();
  }

  private stage3Generate(
    analysis: SemanticAnalysis,
    ast: ReturnType<MQL5Parser['parse']>['ast'],
    fileName: string,
  ): GeneratedOutput {
    const generator = new CodeGenerator(analysis, ast, fileName);
    return generator.generate();
  }

  private stage4Test(analysis: SemanticAnalysis, generated: GeneratedOutput): number {
    let confidence = 50; // Base score

    // Boost for recognized patterns
    if (analysis.lifecycleHooks.length > 0) confidence += 10;
    if (analysis.inputParams.length > 0) confidence += 5;
    if (analysis.builtinIndicators.length > 0) confidence += 10;

    // Boost for simple/moderate complexity
    if (analysis.complexity === 'simple') confidence += 15;
    if (analysis.complexity === 'moderate') confidence += 10;

    // Penalty for risk flags
    confidence -= analysis.riskFlags.length * 5;

    // Penalty for custom classes (harder to convert)
    if (analysis.usesCustomClasses) confidence -= 10;

    // Penalty for dependencies
    confidence -= analysis.dependsOn.length * 3;

    // Penalty for custom indicators
    confidence -= analysis.customIndicators.length * 5;

    // Boost for standard trading patterns
    confidence += analysis.tradingLogicPatterns.length * 3;

    // Check code was generated
    if (generated.typescript.length > 100) confidence += 5;
    if (generated.pineScript.length > 50) confidence += 5;

    return Math.max(0, Math.min(100, confidence));
  }

  private getRiskFlagMessage(flag: string): string {
    const messages: Record<string, string> = {
      no_stop_loss: 'Orders are placed without stop loss protection',
      no_take_profit: 'Orders are placed without take profit levels',
      unlimited_martingale: 'Martingale lot multiplier detected without safety limits',
      excessive_leverage: 'Position sizing may use excessive leverage',
      grid_without_limits: 'Grid trading detected without maximum order limits',
      high_frequency: 'High frequency trading pattern with many order operations',
      cross_pair_dependency: 'Script depends on multiple currency pairs simultaneously',
      news_dependent: 'Script behavior depends on news/economic calendar events',
    };
    return messages[flag] ?? `Risk flag: ${flag}`;
  }

  private getRiskFlagSuggestion(flag: string): string {
    const suggestions: Record<string, string> = {
      no_stop_loss: 'Add stop loss parameters to protect against unlimited downside',
      no_take_profit: 'Consider adding take profit levels for profit management',
      unlimited_martingale: 'Add MaxOrders parameter and lot multiplication cap',
      excessive_leverage: 'Implement proper risk-per-trade position sizing',
      grid_without_limits: 'Add MaxOrders parameter to cap grid expansion',
      high_frequency: 'Review order frequency and ensure adequate throttling',
      cross_pair_dependency: 'Test correlation behavior under volatile conditions',
      news_dependent: 'Verify news filter integration with EMIL TRADE calendar API',
    };
    return suggestions[flag] ?? 'Review and adjust before deployment';
  }

  private updateProgress(file: ConversionFile, stage: ConversionStage, progress: number): void {
    file.stage = stage;
    file.progress = progress;
    file.updatedAt = new Date().toISOString();
    this.onProgress?.(file.id, stage, progress);
  }
}
