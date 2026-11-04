import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { ResumeVersion } from '../../types/job';
import { apiService } from '../../services/geminiClient';

interface ResumeVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (version: ResumeVersion) => void;
  initialVersion?: ResumeVersion | null;
  profileName: string;
}

export const ResumeVersionModal: React.FC<ResumeVersionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVersion,
  profileName,
}) => {
  if (!isOpen) return null;

  const [versionName, setVersionName] = useState(initialVersion?.versionName || '');
  const [content, setContent] = useState(initialVersion?.content || '');
  const [isDefault, setIsDefault] = useState(initialVersion?.isDefault || false);
  const [tags, setTags] = useState<string[]>(initialVersion?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Document file storage state
  const [fileName, setFileName] = useState<string | undefined>(initialVersion?.fileName);
  const [fileType, setFileType] = useState<'pdf' | 'docx' | 'txt' | 'md' | undefined>(
    initialVersion?.fileType
  );
  const [fileSize, setFileSize] = useState<number | undefined>(initialVersion?.fileSize);
  const [fileData, setFileData] = useState<string | undefined>(initialVersion?.fileData);

  // Upload & Parsing UI state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showRawEditor, setShowRawEditor] = useState(!initialVersion?.fileData);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleProcessFile = async (file: File) => {
    setParseError(null);
    setParseSuccessMessage(null);
    setIsParsing(true);

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();
    const validExts = ['pdf', 'docx', 'txt', 'md'];

    if (!ext || !validExts.includes(ext)) {
      setParseError('Unsupported file type. Please upload a PDF, Word DOCX, TXT, or Markdown file.');
      setIsParsing(false);
      return;
    }

    // Read as Base64 Data URL
    const reader = new FileReader();
    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
      setIsParsing(false);
    };

    reader.onload = async () => {
      try {
        const base64DataUrl = reader.result as string;

        // Call backend parsing service
        const parsed = await apiService.parseDocument({
          base64: base64DataUrl,
          fileName: name,
          fileType: ext,
        });

        // Store original file data and metadata
        setFileName(name);
        setFileType(ext as 'pdf' | 'docx' | 'txt' | 'md');
        setFileSize(file.size);
        setFileData(base64DataUrl);

        // Populate extracted text
        setContent(parsed.text);

        // Derive version name if not set or default
        if (!versionName.trim() || versionName === 'Standard Resume') {
          const cleanBase = name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          setVersionName(cleanBase);
        }

        setParseSuccessMessage(
          `Document "${name}" successfully parsed (${parsed.wordCount} words extracted for ATS matching).`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error extracting text from document.';
        setParseError(msg);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDownloadOriginal = () => {
    if (!fileData) {
      // Fallback: download content as text
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${versionName || 'resume'}.md`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || `${versionName || 'resume'}.${fileType || 'pdf'}`;
    a.click();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) {
      setParseError('Please provide a version name for this resume.');
      return;
    }

    if (!content.trim()) {
      setParseError('Please upload a resume file (PDF/DOCX) or enter resume content.');
      return;
    }

    const versionToSave: ResumeVersion = {
      id: initialVersion?.id || `res-${Date.now()}`,
      versionName: versionName.trim(),
      content: content.trim(),
      tags,
      isDefault,
      wordCount,
      fileName,
      fileType,
      fileSize,
      fileData,
      uploadedAt: initialVersion?.uploadedAt || new Date().toISOString(),
    };

    onSave(versionToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {initialVersion ? 'Edit Resume Version' : 'Upload & Store Resume Document'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Storing for profile: <span className="font-semibold text-slate-700 dark:text-slate-200">{profileName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[76vh] overflow-y-auto">
          {/* Document Upload Zone */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Document Storage (PDF, Word DOCX, TXT, MD)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                  : fileName
                  ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isParsing ? (
                <div className="flex flex-col items-center py-2 gap-2 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-xs font-medium">Extracting text & ATS keywords from document...</p>
                </div>
              ) : fileName ? (
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 px-2">
                  <div className="flex items-center gap-3 text-left min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {fileName}
                        </span>
                        <span className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {fileType || 'doc'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatFileSize(fileSize)} · {wordCount} words extracted
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fileData && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadOriginal();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Original</span>
                      </button>
                    )}
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                      Replace File
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 py-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      Click to upload
                    </span>{' '}
                    or drag and drop your resume file
                  </p>
                  <p className="text-[11px] text-slate-400">
                    PDF, Word (.docx), TXT, or Markdown (up to 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Parsing status alert */}
            {parseError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {parseSuccessMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{parseSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* Version Identifier & Default checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Version Identifier / Name *
              </label>
              <input
                type="text"
                required
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g. v2.1 - Cloud Architecture Focus"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Set as default resume for this profile
                </span>
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Version Focus Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add focus tag (e.g. React 19, Cloud Architecture, Leadership)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tag
              </button>
            </div>
          </div>

          {/* Extracted ATS Content Accordion / Editor */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRawEditor(!showRawEditor)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Extracted ATS Text Content
                </span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                  ({wordCount} words)
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{showRawEditor ? 'Collapse Text' : 'View / Edit Text'}</span>
                {showRawEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showRawEditor && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p className="text-[11px] text-slate-500">
                  This text is analyzed by the ATS Keyword Scorer and tailored for interview questions. You can fine-tune it here if needed.
                </p>
                <textarea
                  rows={10}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste resume text or upload a PDF/DOCX document above..."
                  className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isParsing}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {initialVersion ? 'Save Version Changes' : 'Save Resume Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
