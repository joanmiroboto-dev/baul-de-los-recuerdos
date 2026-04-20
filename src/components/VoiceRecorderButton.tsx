import React from 'react';
import { Mic, Square, Loader2, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import AudioVisualizer from './AudioVisualizer';
import AudioWaveformPreview from './AudioWaveformPreview';

interface VoiceRecorderButtonProps {
  isRecording: boolean;
  isSupported: boolean;
  isUploading?: boolean;
  duration?: number;
  hasRecording?: boolean;
  audioBlob?: Blob | null;
  analyserData?: Uint8Array | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording?: () => void;
  className?: string;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  isRecording,
  isSupported,
  isUploading = false,
  duration = 0,
  hasRecording = false,
  audioBlob = null,
  analyserData = null,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  className,
}) => {
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <MicOff className="w-8 h-8 opacity-50" />
        </div>
        <span className="text-sm text-center">
          Tu navegador no soporta<br />grabación de audio
        </span>
      </div>
    );
  }

  // Show waveform preview when there's a recording
  if (hasRecording && audioBlob && onClearRecording) {
    return (
      <div className={cn("w-full max-w-md", className)}>
        <AudioWaveformPreview
          audioBlob={audioBlob}
          duration={duration}
          onClear={onClearRecording}
        />
        <p className="text-sm text-muted-foreground text-center mt-2">
          Audio listo para enviar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Audio Visualizer - shown above button when recording */}
      {isRecording && (
        <AudioVisualizer 
          analyserData={analyserData} 
          isRecording={isRecording}
          className="h-8"
        />
      )}
      
      <button
        type="button"
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={isUploading}
        className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
          'shadow-lg hover:shadow-xl active:scale-95',
          isRecording 
            ? 'bg-destructive text-destructive-foreground' 
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
          isUploading && 'opacity-70 cursor-wait',
        )}
        aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isRecording ? (
          <Square className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>
      
      <span className={cn(
        "text-sm font-medium",
        isRecording ? "text-destructive" : "text-muted-foreground"
      )}>
        {isUploading 
          ? 'Subiendo audio...' 
          : isRecording 
            ? `Grabando ${formatDuration(duration)}` 
            : 'Grabar audio'}
      </span>
    </div>
  );
};

export default VoiceRecorderButton;
