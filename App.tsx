import React, { useState } from 'react';
import { Mic, Upload, Sliders, Music, Zap, Activity } from 'lucide-react';
import Slider from './components/Knob';
import Visualizer from './components/Visualizer';
import GeneratedCodeView from './components/GeneratedCodeView';
import { playManualSynth, getAudioContext, fileToBase64 } from './services/audioUtils';
import { generateSynthCodeFromAudio } from './services/geminiService';
import { SynthParams, AppMode, GeneratedCode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.AI_CLONE);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedCode | null>(null);

  // Manual Synth State
  const [synthParams, setSynthParams] = useState<SynthParams>({
    waveType: 'sine',
    frequency: 440,
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0.5,
    filterType: 'lowpass',
    filterFreq: 1000,
    gain: 0.5,
  });

  const handleParamChange = <K extends keyof SynthParams>(key: K, value: SynthParams[K]) => {
    setSynthParams(prev => ({ ...prev, [key]: value }));
  };

  const handleManualPlay = () => {
    getAudioContext().resume(); // Ensure context is running
    playManualSynth(synthParams);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size - limit to 4MB for safety with Gemini
    if (file.size > 4 * 1024 * 1024) {
      alert("File too large. Please upload a short sound effect (< 4MB).");
      return;
    }

    setIsLoading(true);
    setGeneratedResult(null);
    try {
      getAudioContext().resume();
      const base64 = await fileToBase64(file);
      const result = await generateSynthCodeFromAudio(base64, file.type);
      setGeneratedResult(result);
    } catch (error) {
      alert("Error processing audio: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            SynthGen AI
          </span>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setMode(AppMode.AI_CLONE)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === AppMode.AI_CLONE 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AI Clone
          </button>
          <button
            onClick={() => setMode(AppMode.MANUAL)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === AppMode.MANUAL 
                ? 'bg-slate-700 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Manual Design
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Inputs / Controls */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {mode === AppMode.AI_CLONE ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Upload className="text-purple-400" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Upload Audio</h2>
                  <p className="text-xs text-slate-400">Analyze sample & generate code</p>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 hover:bg-slate-700/30 transition-all group relative overflow-hidden">
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <div className="relative z-0">
                  <Music className="mx-auto text-slate-500 group-hover:text-cyan-400 mb-3 transition-colors" size={48} />
                  <p className="text-sm font-medium text-slate-300">
                    Drop your sound file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    .MP3, .WAV, .OGG (Max 4MB)
                  </p>
                </div>
              </div>

              {isLoading && (
                <div className="mt-6 flex flex-col items-center animate-pulse">
                  <div className="text-cyan-400 text-sm font-mono mb-2">ANALYZING WAVEFORM...</div>
                  <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-1/2 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl overflow-y-auto max-h-[calc(100vh-140px)]">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sliders className="text-blue-400" size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Synthesizer</h2>
                  <p className="text-xs text-slate-400">Manual parameter control</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Oscillator Section */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">Oscillator</h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2">
                       <label className="text-xs text-slate-400 block mb-1">WAVEFORM</label>
                       <div className="flex bg-slate-900 rounded p-1">
                         {['sine', 'square', 'sawtooth', 'triangle'].map((w) => (
                           <button
                            key={w}
                            onClick={() => handleParamChange('waveType', w as any)}
                            className={`flex-1 text-xs py-1 rounded capitalize ${synthParams.waveType === w ? 'bg-cyan-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                           >
                             {w}
                           </button>
                         ))}
                       </div>
                     </div>
                     <Slider label="Frequency" value={synthParams.frequency} min={20} max={2000} onChange={v => handleParamChange('frequency', v)} unit="Hz" />
                     <Slider label="Master Gain" value={synthParams.gain} min={0} max={1} onChange={v => handleParamChange('gain', v)} />
                  </div>
                </div>

                {/* Envelope Section */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">Envelope (ADSR)</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <Slider label="Attack" value={synthParams.attack} min={0} max={2} onChange={v => handleParamChange('attack', v)} unit="s" />
                     <Slider label="Decay" value={synthParams.decay} min={0} max={2} onChange={v => handleParamChange('decay', v)} unit="s" />
                     <Slider label="Sustain" value={synthParams.sustain} min={0} max={1} onChange={v => handleParamChange('sustain', v)} />
                     <Slider label="Release" value={synthParams.release} min={0} max={5} onChange={v => handleParamChange('release', v)} unit="s" />
                   </div>
                </div>
                
                 {/* Filter Section */}
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">Filter</h3>
                   <div className="grid grid-cols-1 gap-4">
                      <Slider label="Cutoff" value={synthParams.filterFreq} min={20} max={10000} onChange={v => handleParamChange('filterFreq', v)} unit="Hz" />
                   </div>
                </div>

                <button 
                  onClick={handleManualPlay}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-cyan-900/20 transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Zap size={18} fill="currentColor" />
                  <span>TRIGGER SOUND</span>
                </button>
              </div>
            </div>
          )}

          {/* Visualization Panel (Always visible on left bottom on desktop) */}
          <div className="mt-auto">
             <Visualizer />
          </div>

        </div>

        {/* Right Panel: Code Output */}
        <div className="lg:col-span-7 h-full min-h-[500px]">
          {generatedResult ? (
            <GeneratedCodeView 
              code={generatedResult.code} 
              explanation={generatedResult.explanation}
              onUpdateCode={(code, expl) => setGeneratedResult({ code, explanation: expl })}
            />
          ) : mode === AppMode.MANUAL ? (
             // Placeholder for manual mode code generation (Could be deterministic based on params)
             <div className="h-full bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center p-10 text-center">
                <div>
                   <Music className="mx-auto text-slate-600 mb-4" size={64} />
                   <h3 className="text-xl font-bold text-slate-500">Manual Mode Active</h3>
                   <p className="text-slate-600 mt-2 max-w-sm">
                     Use the controls on the left to design a sound. 
                     (Feature Idea: Real-time code generation for manual controls coming soon)
                   </p>
                </div>
             </div>
          ) : (
             <div className="h-full bg-slate-800/50 border border-slate-800 rounded-xl flex items-center justify-center p-10 text-center">
                <div>
                   <div className="w-16 h-16 bg-slate-700 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                      <Activity className="text-slate-500" size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-400">Ready to Clone</h3>
                   <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                     Upload an audio file on the left to generate the Web Audio API code that recreates it.
                   </p>
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
