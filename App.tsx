import React, { useState, useEffect, useRef } from 'react';
import Visualizer from './components/Visualizer';
import { getAudioContext, getMasterGain, executeGeneratedCode, fileToBase64, setMasterVolume, playManualSynth } from './services/audioUtils';
import { generateSynthCodeFromAudio, generateSynthCodeFromText, refineCodeWithPrompt } from './services/geminiService';
import { SynthParams, AppMode, LibraryItem } from './types';
import { Play, Square, Trash2, Copy, ChevronRight, ChevronDown } from 'lucide-react';

// New Sleek Icon
const SoundWaveIcon = () => (
    <svg className="w-6 h-6 text-[#33ccff] icon-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M16 8v8" />
        <path d="M8 8v8" />
        <path d="M20 10v4" />
        <path d="M4 10v4" />
    </svg>
);

const WaveIcons: Record<string, React.ReactNode> = {
    sine: <path d="M2 12c0-9 10-9 10 0s10 9 10 0" />,
    square: <path d="M3 12h4v-8h6v16h6v-8h2" />,
    sawtooth: <path d="M4 18L12 6v12l8-12" />,
    triangle: <path d="M3 18l9-12 9 12" />
};

const DEFAULT_CODE = `// Welcome to SynthGen AI
const osc = ctx.createOscillator();
const gain = ctx.createGain();

osc.type = 'triangle'; 
osc.frequency.setValueAtTime(261.63, ctx.currentTime); 
osc.frequency.linearRampToValueAtTime(329.63, ctx.currentTime + 1.0); 

gain.gain.setValueAtTime(0, ctx.currentTime);
gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2); 
gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0); 

osc.connect(gain);
gain.connect(destination);

osc.start();
osc.stop(ctx.currentTime + 2.1);`;

const App: React.FC = () => {
    // UI State
    const [mode, setMode] = useState<AppMode>(AppMode.AI_CLONE);
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const [masterVol, setMasterVolState] = useState(1.0);
    
    // Logic State
    const [generatedCode, setGeneratedCode] = useState(DEFAULT_CODE);
    const [explanation, setExplanation] = useState("System Online. Waiting for input.");
    const [userPrompt, setUserPrompt] = useState("");
    const [refinePrompt, setRefinePrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Library State
    const [library, setLibrary] = useState<LibraryItem[]>([]);
    const [pendingDeletes, setPendingDeletes] = useState<Record<string, number>>({});
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [playingId, setPlayingId] = useState<string | null>(null);

    // Manual Synth Params
    const [synthParams, setSynthParams] = useState<SynthParams>({
        waveType: 'triangle',
        frequency: 440,
        gain: 0.5,
        filterFreq: 2000,
        filterType: 'lowpass',
        attack: 0.1,
        decay: 0.3,
        sustain: 0.5,
        release: 1.0
    });

    // Refs
    const splitterRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);

    // --- Audio Init ---
    useEffect(() => {
        getAudioContext();
        setMasterVolume(1.0);
        const saved = localStorage.getItem('synthgen_library');
        if (saved) {
            setLibrary(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('synthgen_library', JSON.stringify(library));
    }, [library]);

    // --- Splitter Logic ---
    const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); e.preventDefault(); };
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !workspaceRef.current) return;
            const rect = workspaceRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
            if (newWidth > 20 && newWidth < 80) setLeftPanelWidth(newWidth);
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.cursor = 'default';
        }
        return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    }, [isDragging]);

    // --- Library Actions ---
    const addToLibrary = (code: string, desc: string, title: string = "Generated Sound") => {
        const newItem: LibraryItem = {
            id: crypto.randomUUID(),
            title: title,
            code: code,
            description: desc,
            notes: "",
            timestamp: Date.now()
        };
        setLibrary(prev => [newItem, ...prev]);
        return newItem;
    };

    const startDelete = (id: string) => {
        setPendingDeletes(prev => ({ ...prev, [id]: 3 }));
    };

    const cancelDelete = (id: string) => {
        setPendingDeletes(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    // Countdown effect
    useEffect(() => {
        const interval = setInterval(() => {
            setPendingDeletes(prev => {
                const next = { ...prev };
                let changed = false;
                for (const id in next) {
                    if (next[id] > 0) {
                        next[id] -= 1;
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Effect to handle actual deletion when count hits 0
    useEffect(() => {
        Object.entries(pendingDeletes).forEach(([id, count]) => {
            if (count <= 0) {
                setLibrary(prev => prev.filter(item => item.id !== id));
                setPendingDeletes(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        });
    }, [pendingDeletes]);

    const updateItem = (id: string, updates: Partial<LibraryItem>) => {
        setLibrary(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const playLibraryItem = (item: LibraryItem) => {
        if (playingId === item.id) {
            setPlayingId(null);
            getAudioContext().suspend(); // Hard stop for demo purposes
            setTimeout(() => getAudioContext().resume(), 50);
        } else {
            getAudioContext().resume();
            executeGeneratedCode(item.code);
            setPlayingId(item.id);
            setTimeout(() => setPlayingId(null), 2000); 
        }
    };

    const loadIntoEditor = (item: LibraryItem) => {
        setGeneratedCode(item.code);
        setExplanation(`Loaded module: ${item.title}`);
    };

    // --- Actions ---
    const updateVolume = (val: number) => {
        setMasterVolState(val);
        setMasterVolume(val);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) { setExplanation("ERROR: File too large (Max 4MB)."); return; }
        
        setIsLoading(true);
        setExplanation("Uploading & Analyzing Audio...");
        try {
            const base64 = await fileToBase64(file);
            const result = await generateSynthCodeFromAudio(base64, file.type);
            setGeneratedCode(result.code);
            setExplanation("Analysis complete. Code generated from source audio.");
            addToLibrary(result.code, result.explanation, file.name || "Imported Audio");
        } catch (error: any) {
            setExplanation("Analysis Failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTextGen = async () => {
        if (!userPrompt.trim()) return;
        setIsLoading(true);
        setExplanation("Generating synthesis parameters...");
        try {
            const result = await generateSynthCodeFromText(userPrompt, synthParams);
            setGeneratedCode(result.code);
            setExplanation("Generation complete. Module ready.");
            addToLibrary(result.code, result.explanation, userPrompt);
        } catch (error: any) {
            setExplanation("Generation Failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefine = async () => {
        if (!refinePrompt.trim()) return;
        setIsLoading(true);
        setExplanation("Refining module logic...");
        try {
            const result = await refineCodeWithPrompt(generatedCode, refinePrompt);
            setGeneratedCode(result.code);
            setExplanation("Refinement applied.");
            
            // Generate a distinct title for the refined version
            const timestamp = new Date().toLocaleTimeString();
            const refineTitle = `Refined: ${refinePrompt.slice(0, 15)}... (${timestamp})`;
            
            // Save to Library Automatically
            addToLibrary(result.code, result.explanation, refineTitle);
            
            setRefinePrompt("");
        } catch (error: any) {
             setExplanation("Refinement Failed: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const runCode = () => {
        getAudioContext().resume();
        executeGeneratedCode(generatedCode);
    };

    const triggerManual = () => {
        getAudioContext().resume();
        playManualSynth(synthParams);
    };

    const updateParam = (key: keyof SynthParams, val: any) => {
        setSynthParams(prev => ({...prev, [key]: val}));
    };

    return (
        <div className="flex flex-col h-screen p-6 box-border select-none font-ui font-light">
            
            {/* HEADER */}
            <header className="flex justify-between items-center mb-6 pb-2 border-b border-gray-800 flex-shrink-0 z-10">
                <div className="flex flex-col w-1/4">
                    <h1 className="text-2xl text-white font-light tracking-tight flex items-center gap-3">
                        <SoundWaveIcon />
                        <span className="font-semibold tracking-tighter">SYNTHGEN</span> AI
                    </h1>
                </div>

                <div className="flex-grow flex justify-center">
                    {/* ENHANCED TOGGLE UI */}
                    <div className="flex bg-black/40 border border-[#33ccff]/30 p-1 rounded-sm gap-1">
                        <button 
                            onClick={() => setMode(AppMode.AI_CLONE)} 
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-sm ${
                                mode === AppMode.AI_CLONE 
                                ? 'bg-[#33ccff] text-black shadow-[0_0_15px_rgba(51,204,255,0.4)]' 
                                : 'text-slate-500 hover:text-[#33ccff] hover:bg-[#33ccff]/5'
                            }`}
                        >
                            Audio Library
                        </button>
                        <button 
                            onClick={() => setMode(AppMode.MANUAL)} 
                            className={`px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 rounded-sm ${
                                mode === AppMode.MANUAL 
                                ? 'bg-[#33ccff] text-black shadow-[0_0_15px_rgba(51,204,255,0.4)]' 
                                : 'text-slate-500 hover:text-[#33ccff] hover:bg-[#33ccff]/5'
                            }`}
                        >
                            Manual Synth
                        </button>
                    </div>
                </div>

                <div className="w-1/4 flex flex-col items-end gap-1">
                     <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        v2.0 // <span className="text-[#33ccff]">ONLINE</span>
                    </div>
                </div>
            </header>

            {/* TOP ROW */}
            <div className="flex w-full h-32 gap-6 mb-6 flex-shrink-0 z-10">
                <div className="flex-grow">
                    <Visualizer />
                </div>
                <div className="w-72 bg-black/40 border border-gray-800 p-6 flex flex-col justify-center gap-4 relative backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <label className="text-xs text-[#33ccff] font-bold uppercase tracking-wider">Master Out</label>
                        </div>
                        <button onClick={() => updateVolume(1.0)} className="text-[10px] text-slate-500 hover:text-white border border-transparent hover:border-[#33ccff] hover:bg-[#33ccff]/10 px-3 py-1 transition-all uppercase font-bold">
                            RESET
                        </button>
                    </div>
                    <input type="range" min="0" max="2" step="0.01" value={masterVol} onChange={(e) => updateVolume(parseFloat(e.target.value))} className="cyber-range" />
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div ref={workspaceRef} className="flex flex-grow overflow-hidden z-10 relative gap-4">
                {/* LEFT PANEL */}
                <div className="glass-panel relative flex flex-col" style={{ flexBasis: `${leftPanelWidth}%` }}>
                    <div className="flex h-12 border-b border-white/10 bg-black/40 relative z-20 items-center px-4">
                        <h2 className="text-white font-semibold text-xs uppercase tracking-wide flex items-center gap-3">
                            <span className="w-1.5 h-1.5 bg-[#33ccff] rounded-full"></span>
                            {mode === AppMode.AI_CLONE ? 'Audio Library' : 'Synthesizer Controls'}
                        </h2>
                        {mode === AppMode.AI_CLONE && (
                            <span className="ml-auto text-[10px] text-slate-500 font-mono">{library.length} ITEMS</span>
                        )}
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex flex-col flex-grow bg-[#080c10]">
                        {mode === AppMode.AI_CLONE ? (
                            <div className="flex flex-col h-full">
                                {/* COMPACT DROP ZONE */}
                                <div className="p-4 border-b border-white/5">
                                    <div className="border border-dashed border-slate-700 bg-[#050a10]/50 h-20 flex items-center justify-center gap-4 hover:border-[#33ccff]/50 hover:bg-[#33ccff]/5 transition-all relative group cursor-pointer rounded">
                                        <div className="text-slate-500 group-hover:text-[#33ccff] transition-colors">
                                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium group-hover:text-white transition-colors">
                                            IMPORT AUDIO FILE
                                        </div>
                                        <input type="file" className="opacity-0 absolute inset-0 cursor-pointer" accept="audio/*" onChange={handleFileUpload} />
                                    </div>
                                    {isLoading && <div className="mt-2 text-[#33ccff] font-mono text-[10px] text-center animate-pulse">ANALYZING SIGNAL...</div>}
                                </div>

                                {/* LIBRARY LIST */}
                                <div className="flex-grow p-2 space-y-2">
                                    {library.length === 0 && !isLoading && (
                                        <div className="text-center p-8 text-slate-700 text-xs tracking-widest uppercase">Library Empty</div>
                                    )}
                                    {library.map((item) => {
                                        const isDeleting = pendingDeletes[item.id] !== undefined;
                                        const count = pendingDeletes[item.id];
                                        const isExpanded = expandedItems.has(item.id);
                                        const isPlaying = playingId === item.id;

                                        if (isDeleting) {
                                            return (
                                                <div key={item.id} className="h-20 bg-red-950/40 border border-red-500/30 relative overflow-hidden transition-all flex items-center">
                                                    <div className="flex-grow flex items-center justify-center">
                                                        <span className="text-red-500 font-bold text-sm uppercase tracking-widest">
                                                            DELETING IN {count}...
                                                        </span>
                                                    </div>
                                                    <button onClick={() => cancelDelete(item.id)} className="h-full w-24 bg-red-600 text-white font-header text-xs uppercase tracking-wider hover:bg-white hover:text-black transition-colors shadow-lg shadow-red-900/50 border-l border-red-500/30">
                                                        UNDO
                                                    </button>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={item.id} className="bg-black/20 border border-white/5 hover:border-white/10 transition-colors group">
                                                <div className="flex h-14 border-b border-white/5">
                                                    {/* PLAY/STOP BUTTON */}
                                                    <button 
                                                        onClick={() => playLibraryItem(item)}
                                                        className={`w-14 h-full flex items-center justify-center transition-all ${
                                                            isPlaying 
                                                            ? 'bg-[#33ccff]/10 text-[#33ccff] hover:bg-red-500 hover:text-black hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]' 
                                                            : 'bg-[#33ccff]/5 text-[#33ccff] hover:bg-[#33ccff] hover:text-black hover:shadow-[0_0_15px_rgba(51,204,255,0.6)]'
                                                        }`}
                                                    >
                                                        {isPlaying ? <Square size={14} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
                                                    </button>
                                                    
                                                    {/* METADATA */}
                                                    <div 
                                                        className="flex-grow px-3 flex flex-col justify-center min-w-0 cursor-pointer hover:bg-white/5 transition-colors"
                                                        onClick={() => loadIntoEditor(item)}
                                                    >
                                                        <div className="flex items-baseline gap-2 mb-0.5">
                                                            <input 
                                                                value={item.title}
                                                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-[#33ccff] text-white text-xs font-bold font-ui uppercase tracking-wide focus:outline-none w-full"
                                                                placeholder="Untitled Sound"
                                                            />
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-mono truncate w-full">
                                                            {new Date(item.timestamp).toLocaleTimeString()}
                                                        </div>
                                                    </div>

                                                    {/* DELETE BUTTON */}
                                                    <button 
                                                        onClick={() => startDelete(item.id)}
                                                        className="w-12 h-full text-slate-700 hover:text-white hover:bg-red-500/80 transition-all border-l border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* NOTES & EXPAND */}
                                                <div className="p-2 bg-black/30">
                                                    <input 
                                                        value={item.notes}
                                                        onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                                                        placeholder="Enter notes..."
                                                        className="w-full bg-black/50 border border-slate-800 text-xs text-slate-300 p-1.5 focus:border-[#33ccff] focus:outline-none font-mono mb-2"
                                                    />
                                                    
                                                    <button 
                                                        onClick={() => toggleExpand(item.id)}
                                                        className="w-full flex items-center justify-between px-2 py-1 text-[9px] text-slate-600 hover:text-slate-400 uppercase tracking-wider border border-transparent hover:border-[#33ccff]/20 transition-colors"
                                                    >
                                                        <span>Generated Description</span>
                                                        {isExpanded ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                                    </button>
                                                    
                                                    {isExpanded && (
                                                        <div className="mt-2 relative animate-in slide-in-from-top-2 duration-200">
                                                            <textarea 
                                                                value={item.description}
                                                                onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                                                className="w-full h-24 bg-black/50 border border-slate-700 text-[10px] text-slate-300 font-mono p-2 focus:border-[#33ccff] focus:outline-none resize-none leading-relaxed"
                                                                spellCheck={false}
                                                            />
                                                            <button 
                                                                onClick={() => navigator.clipboard.writeText(item.description)}
                                                                className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900 text-[#33ccff] border border-[#33ccff] hover:bg-[#33ccff] hover:text-black text-[9px] font-bold uppercase transition-all z-10 shadow-lg"
                                                            >
                                                                COPY
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8 p-6">
                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-[#33ccff] tracking-wider">AI PROMPT GENERATOR</div>
                                    <div className="flex gap-3 h-10">
                                        <input 
                                            type="text" 
                                            className="w-full bg-black/50 border border-slate-700 px-4 text-sm font-mono text-white focus:border-[#33ccff] outline-none placeholder-slate-600"
                                            placeholder="e.g. 'Retro laser jump'"
                                            value={userPrompt}
                                            onChange={e => setUserPrompt(e.target.value)}
                                        />
                                        <button onClick={handleTextGen} disabled={isLoading} className="cyber-btn px-6 text-sm font-bold">GEN</button>
                                    </div>
                                </div>
                                
                                <div className="h-px bg-slate-800"></div>

                                <div className="space-y-6">
                                    <div className="text-xs font-bold text-slate-500 tracking-wider">MANUAL OVERRIDE</div>
                                    
                                    <div className="grid grid-cols-4 gap-2">
                                        {['sine','square','sawtooth','triangle'].map(t => (
                                            <button key={t} 
                                                onClick={() => updateParam('waveType', t)}
                                                className={`wave-icon-btn ${synthParams.waveType === t ? 'active' : ''}`}
                                            >
                                                <svg className="wave-svg" viewBox="0 0 24 24">{WaveIcons[t]}</svg>
                                                <span className="text-[10px] uppercase font-bold">{t === 'sawtooth' ? 'saw' : t}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between text-[10px] text-[#33ccff] font-bold tracking-wider mb-2"><span>FREQUENCY</span><span>{synthParams.frequency} Hz</span></div>
                                            <input type="range" className="cyber-range" min="50" max="2000" value={synthParams.frequency} onChange={e => updateParam('frequency', Number(e.target.value))} />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] text-[#33ccff] font-bold tracking-wider mb-2"><span>FILTER CUTOFF</span><span>{synthParams.filterFreq} Hz</span></div>
                                            <input type="range" className="cyber-range" min="100" max="5000" value={synthParams.filterFreq} onChange={e => updateParam('filterFreq', Number(e.target.value))} />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-4 pt-2">
                                        {['attack', 'decay', 'sustain', 'release'].map((k) => (
                                            <div key={k} className="flex flex-col gap-2">
                                                <span className="text-[10px] text-center text-slate-400 font-bold uppercase">{k.charAt(0)}</span>
                                                <input 
                                                    type="range" 
                                                    className="cyber-range" 
                                                    min="0" 
                                                    max={k === 'release' ? 2 : 1} 
                                                    step="0.05" 
                                                    value={synthParams[k as keyof SynthParams]} 
                                                    onChange={e => updateParam(k as keyof SynthParams, Number(e.target.value))} 
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <button onClick={triggerManual} className="cyber-btn cyber-btn-secondary w-full py-3 gap-3 mt-4 text-sm font-bold">
                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                        TRIGGER SOUND
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SPLITTER */}
                <div ref={splitterRef} className={`gutter ${isDragging ? 'gutter-dragging' : ''}`} onMouseDown={handleMouseDown}></div>

                {/* RIGHT PANEL */}
                <div className="glass-panel" style={{ flexBasis: `${100 - leftPanelWidth}%` }}>
                    {/* Header with Full Height Simulate Button */}
                    <div className="flex h-12 border-b border-white/10 bg-black/40 relative z-20 items-stretch justify-between">
                        <div className="flex items-center px-6">
                            <h2 className="text-white font-semibold text-xs uppercase tracking-wide">Generated Module</h2>
                        </div>
                        <div className="flex">
                            <button 
                                onClick={() => navigator.clipboard.writeText(generatedCode)} 
                                className="flex items-center gap-1 px-4 text-[10px] text-slate-400 hover:text-white transition-colors border-l border-white/5"
                            >
                                <Copy size={12}/> COPY
                            </button>
                            {/* MASSIVE SIMULATE BUTTON */}
                            <button 
                                onClick={runCode} 
                                className="flex items-center px-8 bg-[#33ccff]/10 text-[#33ccff] hover:bg-[#33ccff] hover:text-black hover:shadow-[0_0_20px_rgba(51,204,255,0.5)] border-l border-white/10 font-bold tracking-widest text-xs transition-all uppercase gap-2"
                            >
                                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                SIMULATE
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative flex-grow bg-[#080c10] overflow-hidden z-0">
                        <textarea 
                            value={generatedCode}
                            onChange={e => setGeneratedCode(e.target.value)}
                            className="w-full h-full bg-transparent text-cyan-50 font-mono text-xs p-6 border-none focus:outline-none resize-none leading-relaxed"
                            spellCheck={false}
                        ></textarea>
                    </div>

                    <div className="h-48 border-t border-white/10 bg-black/40 flex flex-col">
                        <div className="flex-grow p-4 overflow-y-auto">
                            <div className="text-[10px] font-mono text-slate-400 p-3 bg-black/20 border border-slate-800 rounded leading-relaxed">
                                <span className="text-[#33ccff] font-bold">SYSTEM_MSG:</span> {explanation}
                            </div>
                        </div>
                        <div className="h-12 border-t border-white/5 bg-black/20 flex items-center pr-2">
                            <input 
                                type="text" 
                                className="flex-grow bg-transparent px-4 text-xs font-mono text-white focus:outline-none placeholder-slate-600 h-full"
                                placeholder="Type to refine code..." 
                                value={refinePrompt}
                                onChange={e => setRefinePrompt(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleRefine()}
                            />
                            <button onClick={handleRefine} className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 rounded transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;