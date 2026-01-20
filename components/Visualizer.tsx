import React, { useEffect, useRef } from 'react';
import { getAnalyser } from '../services/audioUtils';

const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const render = () => {
      animationId = requestAnimationFrame(render);

      // Handle resize explicitly for sharp rendering
      if (canvas.parentElement && canvas.width !== canvas.parentElement.offsetWidth) {
          canvas.width = canvas.parentElement.offsetWidth;
          canvas.height = canvas.parentElement.offsetHeight;
      }
      const w = canvas.width;
      const h = canvas.height;
      
      analyser.getByteTimeDomainData(dataArray);

      // Clear
      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#33ccff'; // Neon Accent
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#33ccff';
      ctx.beginPath();

      const sliceWidth = w * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * h / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="w-full h-full bg-black border border-gray-800 relative overflow-hidden">
        <div className="crt-overlay"></div>
         <div className="absolute top-2 left-3 text-xs text-[#33ccff] font-bold tracking-widest pointer-events-none uppercase z-20 opacity-80">
            Oscilloscope // Signal Feed
        </div>
        <canvas ref={canvasRef} className="w-full h-full opacity-90 relative z-0"></canvas>
    </div>
  );
};

export default Visualizer;