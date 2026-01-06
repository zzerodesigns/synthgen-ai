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
}

export enum AppMode {
  MANUAL = 'MANUAL',
  AI_CLONE = 'AI_CLONE'
}