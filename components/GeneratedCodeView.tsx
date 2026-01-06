import React, { useState } from 'react';
import { Play, Copy, Wand2, Terminal } from 'lucide-react';
import { executeGeneratedCode } from '../services/audioUtils';
import { refineCodeWithPrompt } from '../services/geminiService';

interface Props {
  code: string;
  explanation: string;
  onUpdateCode: (code: string, explanation: string) => void;
}

const GeneratedCodeView: React.FC<Props> = ({ code, explanation, onUpdateCode }) => {
  const [isRefining, setIsRefining] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("Copy");

  const handleRun = () => {
    executeGeneratedCode(code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopyFeedback("Copied!");
    setTimeout(() => setCopyFeedback("Copy"), 2000);
  };

  const handleRefine = async () => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const result = await refineCodeWithPrompt(code, refinePrompt);
      onUpdateCode(result.code, result.explanation);
      setRefinePrompt("");
    } catch (e) {
      alert("Failed to refine code.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Terminal size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider">Generated Module</h3>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
          >
            <Copy size={12} />
            <span>{copyFeedback}</span>
          </button>
          <button 
            onClick={handleRun}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-500 rounded text-white shadow-lg shadow-green-900/20 transition-all active:scale-95"
          >
            <Play size={12} fill="currentColor" />
            <span>Simulate</span>
          </button>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
        <pre className="text-xs font-mono leading-relaxed text-slate-300">
          <code>{code}</code>
        </pre>
      </div>

      {/* Footer / Explanation */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-4 italic">
          "{explanation}"
        </p>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Refine with AI (e.g., 'Make it more metallic', 'Add echo')"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
          />
          <button 
            onClick={handleRefine}
            disabled={isRefining || !refinePrompt.trim()}
            className="absolute right-1 top-1 bottom-1 px-2 text-cyan-500 hover:text-cyan-400 disabled:opacity-50"
          >
            {isRefining ? <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div> : <Wand2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedCodeView;
