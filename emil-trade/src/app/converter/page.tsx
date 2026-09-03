'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, Sparkles, FileCode, TrendingUp, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { UploadZone } from '@/components/converter/UploadZone';
import { ConversionCard } from '@/components/converter/ConversionCard';
import { CodeDiff, CodeTabs } from '@/components/converter/CodeDiff';
import { DeploymentPanel } from '@/components/converter/DeploymentPanel';
import type { ConversionFile, GeneratedOutput } from '@/types/converter';

export default function ConverterPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [conversions, setConversions] = useState<ConversionFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ConversionFile | null>(null);
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [deployFileId, setDeployFileId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const handleUpload = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/converter/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        console.error('Upload failed:', data.error);
        return;
      }

      // Fetch full conversion files
      const fileRes = await fetch(`/api/converter/files?jobId=${data.jobId}`);
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        setConversions(prev => [...prev, ...fileData.files]);
      } else {
        // Fallback: use the summary data from upload response
        const summaryFiles: ConversionFile[] = data.files.map((f: Record<string, unknown>) => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: 0,
          fileType: 'mq5',
          originalCode: '',
          stage: f.stage,
          progress: f.success ? 100 : 0,
          confidenceScore: f.confidenceScore ?? 0,
          semanticAnalysis: null,
          generatedOutput: null,
          errors: f.errors ?? [],
          warnings: f.warnings ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setConversions(prev => [...prev, ...summaryFiles]);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleViewDetails = (id: string) => {
    const file = conversions.find(f => f.id === id);
    if (file) {
      setSelectedFile(file);
      setShowDeployPanel(false);
    }
  };

  const handleDeploy = (id: string) => {
    setDeployFileId(id);
    setShowDeployPanel(true);
    setSelectedFile(conversions.find(f => f.id === id) ?? null);
  };

  const handleDeploySubmit = async (config: { scope: string; target: string; publishToMarketplace: boolean }) => {
    if (!deployFileId) return;
    setIsDeploying(true);
    try {
      const res = await fetch('/api/converter/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversionFileId: deployFileId, ...config }),
      });
      if (res.ok) {
        setConversions(prev => prev.map(f =>
          f.id === deployFileId ? { ...f, stage: 'deployed' as const } : f
        ));
        setShowDeployPanel(false);
      }
    } catch (err) {
      console.error('Deploy error:', err);
    } finally {
      setIsDeploying(false);
    }
  };

  const generated = selectedFile?.generatedOutput as GeneratedOutput | null;

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#00b4ff]/20 to-[#8b5cf6]/20">
              <Cpu className="h-5 w-5 text-[#00b4ff]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">MT5 → RAPTOR Converter</h1>
              <p className="text-xs text-white/40">Convert Expert Advisors & Indicators to EMIL TRADE native format</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Panel — Upload + Conversion List */}
          <div className="col-span-5 space-y-6">
            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <Sparkles className="h-3 w-3" />, label: 'AI-Powered Analysis' },
                { icon: <FileCode className="h-3 w-3" />, label: 'TypeScript + Pine Script' },
                { icon: <TrendingUp className="h-3 w-3" />, label: 'Signal Parity Check' },
                { icon: <BarChart3 className="h-3 w-3" />, label: 'Auto-Backtest' },
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] text-white/40 border border-white/[0.06] bg-white/[0.02]">
                  {icon}{label}
                </span>
              ))}
            </div>

            <UploadZone onUpload={handleUpload} isUploading={isUploading} />

            {/* Conversion Results */}
            {conversions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-white/60">
                  Conversions ({conversions.length})
                </h2>
                {conversions.map(file => (
                  <ConversionCard
                    key={file.id}
                    file={file}
                    onViewDetails={handleViewDetails}
                    onDeploy={handleDeploy}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Panel — Code View / Deploy */}
          <div className="col-span-7">
            {selectedFile && !showDeployPanel && generated ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-white/60">{selectedFile.fileName}</h2>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-white/30 hover:text-white/60"
                  >
                    Close
                  </button>
                </div>

                {/* Side-by-side diff */}
                <CodeDiff
                  originalCode={selectedFile.originalCode}
                  convertedCode={generated.typescript}
                />

                {/* Additional outputs */}
                <CodeTabs
                  tabs={[
                    { label: 'Pine Script', code: generated.pineScript, language: 'pine' },
                    { label: 'Zod Schema', code: generated.zodSchema, language: 'typescript' },
                    { label: 'Config Component', code: generated.configComponent, language: 'tsx' },
                    { label: 'Tests', code: generated.testScaffold, language: 'typescript' },
                  ]}
                />

                {/* Documentation */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-xs font-medium text-white/50 mb-3">Documentation</h3>
                  <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono leading-5">
                    {generated.documentation}
                  </pre>
                </div>
              </motion.div>
            ) : showDeployPanel && selectedFile ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <DeploymentPanel
                  scriptName={selectedFile.fileName.replace(/\.(mq5|ex5)$/i, '')}
                  riskFlags={selectedFile.semanticAnalysis?.riskFlags ?? []}
                  requiresBrokerApproval={selectedFile.semanticAnalysis?.riskFlags.length ? true : false}
                  onDeploy={handleDeploySubmit}
                  isDeploying={isDeploying}
                />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-96 rounded-xl border border-dashed border-white/[0.06]">
                <div className="text-center">
                  <Cpu className="h-12 w-12 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Upload MQL5 files to see conversion results</p>
                  <p className="text-xs text-white/15 mt-1">Side-by-side comparison, risk analysis, and deployment options</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
