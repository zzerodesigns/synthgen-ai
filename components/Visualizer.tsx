import React, { useEffect, useRef } from 'react';
import { getAnalyser } from '../services/audioUtils';

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a user interaction check wrapper if needed, 
    // but here we assume AudioContext might be resumed elsewhere.
    const analyser = getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Clear with transparency for trail effect? No, clean wipe for scope.
      ctx.fillStyle = '#0f172a'; // Match bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#22d3ee'; // Cyan-400
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="w-full h-32 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={200} 
        className="w-full h-full block"
      />
      <div className="absolute top-2 right-2 text-xs text-slate-500 font-mono">OSCILLOSCOPE</div>
    </div>
  );
};

export default Visualizer;
