import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 0.01, onChange, unit = '' }) => {
  return (
    <div className="flex flex-col space-y-1 mb-4">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
        <label>{label.toUpperCase()}</label>
        <span>{value.toFixed(2)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      />
    </div>
  );
};

export default Slider;
