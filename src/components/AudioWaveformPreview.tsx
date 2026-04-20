import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface AudioWaveformPreviewProps {
  audioBlob: Blob;
  duration: number;
  onClear: () => void;
  className?: string;
}

const AudioWaveformPreview: React.FC<AudioWaveformPreviewProps> = ({
  audioBlob,
  duration,
  onClear,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Generate waveform data from audio blob
  useEffect(() => {
    const generateWaveform = async () => {
      try {
        const audioContext = new AudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = 40; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        // Normalize data
        const maxVal = Math.max(...filteredData);
        const normalizedData = filteredData.map(val => val / (maxVal || 1));
        setWaveformData(normalizedData);
        
        audioContext.close();
      } catch (error) {
        console.error('Error generating waveform:', error);
        // Fallback: generate random-ish waveform
        const fallbackData = Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.8);
        setWaveformData(fallbackData);
      }
    };

    generateWaveform();
  }, [audioBlob]);

  // Create audio URL
  useEffect(() => {
    audioUrlRef.current = URL.createObjectURL(audioBlob);
    
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [audioBlob]);

  // Handle audio playback updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("bg-secondary/60 rounded-xl p-4 border border-border", className)}>
      <audio ref={audioRef} src={audioUrlRef.current || undefined} />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={togglePlayback}
          className="w-10 h-10 rounded-full shrink-0"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>

        {/* Waveform visualization */}
        <div className="flex-1 flex items-center gap-[2px] h-10 px-2">
          {waveformData.map((value, index) => {
            const barProgress = (index / waveformData.length) * 100;
            const isActive = barProgress <= progressPercent;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex-1 rounded-full transition-colors duration-100",
                  isActive ? "bg-primary" : "bg-muted-foreground/40"
                )}
                style={{
                  height: `${Math.max(4, value * 32)}px`,
                }}
              />
            );
          })}
        </div>

        {/* Duration */}
        <span className="text-sm font-medium text-muted-foreground shrink-0 w-12 text-right">
          {formatTime(isPlaying ? currentTime : duration)}
        </span>

        {/* Delete button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AudioWaveformPreview;
