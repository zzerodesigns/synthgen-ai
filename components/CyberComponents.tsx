import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

export const CyberButton: React.FC<CyberButtonProps> = ({ children, variant = 'primary', icon, className = '', ...props }) => {
  let btnClass = "cyber-btn"; // Default class from global CSS
  
  if (variant === 'secondary') btnClass += " cyber-btn-secondary";
  if (variant === 'danger') btnClass += " cyber-btn-danger";

  return (
    <button className={`${btnClass} ${className} px-4 py-3 text-xs font-bold`} {...props}>
      <div className="flex items-center justify-center space-x-2">
        {icon}
        <span>{children}</span>
      </div>
    </button>
  );
};

interface CyberPlayerProps {
  src: string;
}

export const CyberPlayer: React.FC<CyberPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full bg-black/40 border border-slate-700 p-3 flex items-center gap-3 relative overflow-hidden group">
      <audio ref={audioRef} src={src} />
      
      <button 
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>

      <div className="flex-1 space-y-1">
        <div className="flex justify-between text-[9px] font-mono text-cyan-500/70 tracking-widest uppercase">
            <span>Audio Preview</span>
        </div>
        <div className="h-1 bg-slate-800 w-full">
            <div 
               className="h-full bg-cyan-500 relative"
               style={{ width: `${progress}%` }}
            />
        </div>
      </div>
    </div>
  );
};