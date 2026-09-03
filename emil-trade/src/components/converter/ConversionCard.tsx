'use client';

import { motion } from 'framer-motion';
import {
  FileCode, CheckCircle2, AlertTriangle, XCircle,
  Loader2, Shield, Zap, ChevronRight,
} from 'lucide-react';
import type { ConversionFile, ConversionStage } from '@/types/converter';

interface ConversionCardProps {
  file: ConversionFile;
  onViewDetails: (id: string) => void;
  onDeploy: (id: string) => void;
}

const STAGE_CONFIG: Record<ConversionStage, { label: string; color: string; icon: React.ReactNode }> = {
  queued: { label: 'Queued', color: '#ffffff40', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  parsing: { label: 'Parsing MQL5', color: '#00b4ff', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  analyzing: { label: 'Analyzing Logic', color: '#8b5cf6', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  converting: { label: 'Generating Code', color: '#f59e0b', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  testing: { label: 'Testing Output', color: '#00dc82', icon: <Loader2 className="h-4 w-4 animate-spin" /> },
  ready: { label: 'Ready', color: '#00dc82', icon: <CheckCircle2 className="h-4 w-4" /> },
  failed: { label: 'Failed', color: '#ef4444', icon: <XCircle className="h-4 w-4" /> },
  deployed: { label: 'Deployed', color: '#00b4ff', icon: <Zap className="h-4 w-4" /> },
};

export function ConversionCard({ file, onViewDetails, onDeploy }: ConversionCardProps) {
  const stage = STAGE_CONFIG[file.stage];
  const isProcessing = ['queued', 'parsing', 'analyzing', 'converting', 'testing'].includes(file.stage);
  const analysis = file.semanticAnalysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/5">
          <FileCode className="h-5 w-5 text-[#00b4ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{file.fileName}</h3>
            <span className="text-xs text-white/30">{(file.fileSize / 1024).toFixed(1)}KB</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: stage.color }}>
              {stage.icon}
              {stage.label}
            </span>
            {analysis && (
              <>
                <span className="text-white/10">·</span>
                <span className="text-xs text-white/40 capitalize">{analysis.scriptKind}</span>
                <span className="text-white/10">·</span>
                <span className="text-xs text-white/40 capitalize">{analysis.classification.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Confidence Score */}
        {file.confidenceScore > 0 && (
          <div className="text-right">
            <div className={`text-lg font-mono font-bold ${
              file.confidenceScore >= 80 ? 'text-[#00dc82]' :
              file.confidenceScore >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
            }`}>
              {file.confidenceScore}%
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">confidence</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-3">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: stage.color }}
              initial={{ width: 0 }}
              animate={{ width: `${file.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {analysis && analysis.riskFlags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.riskFlags.map(flag => (
            <span
              key={flag}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20"
            >
              <Shield className="h-2.5 w-2.5" />
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Warnings */}
      {file.warnings.length > 0 && (
        <div className="mt-2">
          <span className="flex items-center gap-1 text-xs text-[#f59e0b]">
            <AlertTriangle className="h-3 w-3" />
            {file.warnings.length} warning{file.warnings.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Errors */}
      {file.errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {file.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400">{err.message}</p>
          ))}
        </div>
      )}

      {/* Actions */}
      {(file.stage === 'ready' || file.stage === 'deployed') && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onViewDetails(file.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            View Code
            <ChevronRight className="h-3 w-3" />
          </button>
          {file.stage === 'ready' && (
            <button
              onClick={() => onDeploy(file.id)}
              className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white transition-all"
            >
              Deploy
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
