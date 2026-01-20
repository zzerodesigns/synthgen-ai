export interface SynthParams {
  waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  frequency: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterType: 'lowpass' | 'highpass' | 'bandpass';
  filterFreq: number;
  gain: number;
}

export interface GeneratedCode {
  code: string;
  explanation: string;
  soundDescription?: string;
  synthParams?: SynthParams;
}

export interface LibraryItem {
  id: string;
  title: string;
  code: string;
  description: string;
  notes: string;
  timestamp: number;
}

export enum AppMode {
  MANUAL = 'MANUAL',
  AI_CLONE = 'AI_CLONE'
}