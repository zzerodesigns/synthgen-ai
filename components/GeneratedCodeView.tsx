import React, { useState } from 'react';
import { Play, Copy, Wand2, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { executeGeneratedCode } from '../services/audioUtils';
import { refineCodeWithPrompt } from '../services/geminiService';
import { CyberButton } from './CyberComponents';

interface Props {
  code: string;
  explanation: string;
  onUpdateCode: (code: string, explanation: string) => void;
}

const GeneratedCodeView: React.FC<Props> = ({ code, explanation, onUpdateCode }) => {
  const [isRefining, setIsRefining] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("Copy");
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-cyan-400">
          <Terminal size={18} />
          <h3 className="font-bold text-sm uppercase tracking-wider font-mono">Generated Module</h3>
        </div>
        <div className="flex space-x-3 items-center">
          <button 
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-slate-300 transition-colors"
          >
            <Copy size={12} />
            <span>{copyFeedback}</span>
          </button>
          
          <CyberButton onClick={handleRun} icon={<Play size={12} fill="currentColor" />}>
            Simulate
          </CyberButton>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="relative flex-1 bg-[#0d1117] group">
        <div className={`overflow-auto p-4 transition-all duration-500 ease-in-out ${isExpanded ? 'h-[600px]' : 'h-[300px] lg:h-auto lg:max-h-[500px]'}`}>
          <pre className="text-xs font-mono leading-relaxed text-slate-300">
            <code>{code}</code>
          </pre>
        </div>
        
        {/* Collapse Toggle Overlay */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0d1117] to-transparent pointer-events-none" />
        )}
        <div className="absolute bottom-4 right-4 z-10">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-800/90 text-xs text-slate-400 border border-slate-700 rounded hover:text-cyan-400 hover:border-cyan-500 transition-colors"
          >
            {isExpanded ? (
               <><span>Collapse</span><ChevronUp size={14}/></>
            ) : (
               <><span>Expand Code</span><ChevronDown size={14}/></>
            )}
          </button>
        </div>
      </div>

      {/* Footer / Explanation */}
      <div className="p-4 bg-slate-800/90 border-t border-slate-700">
        <div className="mb-4">
            <h4 className="text-[10px] font-mono uppercase text-slate-500 mb-1">Logic Explanation</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
            {explanation}
            </p>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Refine logic (e.g., 'Make the decay longer', 'Add a filter sweep')"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            value={refinePrompt}
            onChange={(e) => setRefinePrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
          />
          <button 
            onClick={handleRefine}
            disabled={isRefining || !refinePrompt.trim()}
            className="absolute right-1 top-1 bottom-1 px-2 text-cyan-500 hover:text-cyan-300 disabled:opacity-30 transition-colors"
          >
            {isRefining ? <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div> : <Wand2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratedCodeView;
