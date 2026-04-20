import React from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  analyserData: Uint8Array | null;
  isRecording: boolean;
  className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyserData,
  isRecording,
  className,
}) => {
  const bars = 7;
  
  // Get bar heights from analyser data or use defaults
  const getBarHeights = (): number[] => {
    if (!analyserData || analyserData.length === 0) {
      // Default animation when no data
      return Array(bars).fill(isRecording ? 0.3 : 0.1);
    }

    const heights: number[] = [];
    const step = Math.floor(analyserData.length / bars);
    
    for (let i = 0; i < bars; i++) {
      const index = i * step;
      const value = analyserData[index] || 0;
      // Normalize to 0-1 range with minimum height
      heights.push(Math.max(0.1, value / 255));
    }
    
    return heights;
  };

  const barHeights = getBarHeights();

  if (!isRecording) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {barHeights.map((height, index) => (
        <div
          key={index}
          className="w-1 bg-destructive rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(8, height * 32)}px`,
            opacity: 0.7 + height * 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
