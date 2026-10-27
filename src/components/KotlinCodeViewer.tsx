import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Search, X } from 'lucide-react';

interface KotlinCodeViewerProps {
  onClose: () => void;
}

export const KotlinCodeViewer: React.FC<KotlinCodeViewerProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    // Fetch MainActivity.kt directly or fallback
    fetch('/MainActivity.kt')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then((text) => {
        setCode(text);
        setLoading(false);
      })
      .catch(() => {
        setCode(`// MainActivity.kt - Gold Rush: Sifting Pioneer\n// Please check the MainActivity.kt file at the root of the project.`);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MainActivity.kt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredLines = React.useMemo(() => {
    if (!searchQuery.trim()) return code.split('\n');
    const query = searchQuery.toLowerCase();
    return code
      .split('\n')
      .map((line, idx) => ({ line, num: idx + 1 }))
      .filter((item) => item.line.toLowerCase().includes(query))
      .map((item) => `${item.num}: ${item.line}`);
  }, [code, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl h-[90vh] bg-[#1a1714] border border-[#4D3F30] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 bg-[#241E18] border-b border-[#3D3227] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#E5A93C]" />
            <div>
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                MainActivity.kt
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#382F24] text-[#F6D166] rounded">
                  Kotlin + Jetpack Compose
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">Single-file production-ready Android prototype</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#382F24] hover:bg-[#4D3F30] text-stone-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#E5A93C]" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#E5A93C] hover:bg-[#d89c31] text-stone-950 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download .kt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-[#382F24] rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 bg-[#201A14] border-b border-[#332A20] flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search classes, functions, or variables (e.g. ViewModel, formatNumber, onManualSift)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-stone-200 placeholder-stone-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-stone-500 hover:text-stone-300 text-xs">
              Clear
            </button>
          )}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#14100D] font-mono text-xs text-stone-300 leading-relaxed select-text">
          {loading ? (
            <div className="text-stone-500 text-center py-10">Loading MainActivity.kt...</div>
          ) : (
            <pre className="overflow-x-auto whitespace-pre font-mono text-xs">
              {searchQuery ? filteredLines.join('\n') : code}
            </pre>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#201A14] border-t border-[#332A20] flex items-center justify-between text-[11px] text-stone-400">
          <span>Target: Android API 26+ (Compile SDK 34/35) · Jetpack Compose Material 3</span>
          <span>Copy & paste directly into your Android Studio project</span>
        </div>
      </div>
    </div>
  );
};
