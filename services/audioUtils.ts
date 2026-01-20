import { SynthParams } from '../types';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;

export const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const getMasterGain = (): GainNode => {
  const ctx = getAudioContext();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5; // Default master volume
    masterGain.connect(ctx.destination);
  }
  return masterGain;
};

export const setMasterVolume = (val: number) => {
  const ctx = getAudioContext();
  const master = getMasterGain();
  // Smooth transition to avoid clicks
  master.gain.setTargetAtTime(val, ctx.currentTime, 0.1);
};

export const getAnalyser = (): AnalyserNode => {
  const ctx = getAudioContext();
  const master = getMasterGain();
  if (!analyser) {
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    master.disconnect(); // Disconnect from destination to insert analyser
    master.connect(analyser);
    analyser.connect(ctx.destination);
  }
  return analyser;
};

// Play a sound based on manual parameters
export const playManualSynth = (params: SynthParams) => {
  const ctx = getAudioContext();
  const master = getMasterGain(); // Ensure audio path is built

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = params.waveType;
  osc.frequency.value = params.frequency;

  filter.type = params.filterType;
  filter.frequency.value = params.filterFreq;

  // Envelope
  const now = ctx.currentTime;
  const { attack, decay, sustain, release } = params;

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(params.gain, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(params.gain * sustain, now + attack + decay);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release); // 0.001 to prevent clicks

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(master); // Connect to master (which connects to analyser -> dest)

  osc.start(now);
  osc.stop(now + attack + decay + release + 0.1);
};

// Execute generated code safely-ish
export const executeGeneratedCode = (code: string) => {
  try {
    const ctx = getAudioContext();
    const master = getMasterGain();

    // Wrap code in a function that takes 'ctx' and 'destination'
    // We expect the generated code to either define a function or just run commands.
    // Ideally, we asked the AI to create a function 'playEffect(ctx, destination)'.
    
    // We construct a function body that includes the user code.
    // We assume the code defines a function named 'playEffect' or performs the action immediately.
    // To handle both, we'll try to invoke playEffect if defined, or just let it run.
    
    const runnable = new Function('ctx', 'destination', `
      ${code}
      // Attempt to call playEffect if the user defined it, otherwise assume code ran immediately
      if (typeof playEffect === 'function') {
        playEffect(ctx, destination);
      }
    `);

    runnable(ctx, master);
  } catch (e) {
    console.error("Error executing generated audio code:", e);
    alert("Error executing code: " + e);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/mp3;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};