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
    <div className="flex flex-col space-y-1 mb-3">
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
        <label>{label.toUpperCase()}</label>
        <span className="text-cyan-400">{value.toFixed(2)}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="cyber-range"
      />
    </div>
  );
};

export default Slider;