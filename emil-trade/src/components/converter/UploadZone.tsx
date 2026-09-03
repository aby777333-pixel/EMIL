'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileCode, AlertCircle, X } from 'lucide-react';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  maxFiles?: number;
}

export function UploadZone({ onUpload, isUploading, maxFiles = 50 }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<UploadFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mq5' && ext !== 'ex5') return 'Only .mq5 and .ex5 files are accepted';
    if (file.size > 2 * 1024 * 1024) return 'File exceeds 2MB limit';
    return null;
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadFile[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      if (stagedFiles.length + newFiles.length >= maxFiles) break;
      const error = validateFile(file);
      newFiles.push({
        file,
        id: crypto.randomUUID(),
        status: error ? 'error' : 'pending',
        error: error ?? undefined,
      });
    }

    setStagedFiles(prev => [...prev, ...newFiles]);
  }, [stagedFiles.length, maxFiles]);

  const removeFile = (id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    const validFiles = stagedFiles.filter(f => f.status === 'pending').map(f => f.file);
    if (validFiles.length === 0) return;
    await onUpload(validFiles);
    setStagedFiles([]);
  };

  const validCount = stagedFiles.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-12
          transition-all duration-300 text-center
          ${isDragging
            ? 'border-[#00b4ff] bg-[#00b4ff]/5 scale-[1.01]'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
          }
        `}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mq5,.ex5"
          className="hidden"
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
        <motion.div
          animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Upload className="mx-auto h-12 w-12 text-white/30 mb-4" />
        </motion.div>
        <p className="text-lg font-medium text-white/80">
          {isDragging ? 'Drop your MQL5 files here' : 'Drag & drop MQL5 files'}
        </p>
        <p className="text-sm text-white/40 mt-2">
          .mq5 source files or .ex5 compiled files — up to {maxFiles} files per batch
        </p>
        <p className="text-xs text-white/25 mt-1">Maximum 2MB per file</p>
      </motion.div>

      {/* Staged Files */}
      <AnimatePresence>
        {stagedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{stagedFiles.length} file{stagedFiles.length !== 1 ? 's' : ''} staged</span>
              <button
                onClick={() => setStagedFiles([])}
                className="text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
              {stagedFiles.map(f => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
                    ${f.status === 'error' ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.03] border border-white/5'}
                  `}
                >
                  <FileCode className={`h-4 w-4 shrink-0 ${f.status === 'error' ? 'text-red-400' : 'text-[#00b4ff]'}`} />
                  <span className="flex-1 truncate text-white/70">{f.file.name}</span>
                  <span className="text-xs text-white/30">{(f.file.size / 1024).toFixed(1)}KB</span>
                  {f.error && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {f.error}
                    </span>
                  )}
                  <button onClick={() => removeFile(f.id)} className="text-white/20 hover:text-white/60 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Upload Button */}
            <button
              onClick={handleSubmit}
              disabled={validCount === 0 || isUploading}
              className={`
                w-full py-3 rounded-lg font-medium text-sm transition-all
                ${validCount > 0 && !isUploading
                  ? 'bg-[#00b4ff] hover:bg-[#00b4ff]/80 text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
                }
              `}
            >
              {isUploading
                ? 'Converting...'
                : `Convert ${validCount} file${validCount !== 1 ? 's' : ''}`
              }
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
