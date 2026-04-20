import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  audioBlob: Blob | null;
  error: string | null;
  duration: number;
  analyserData: Uint8Array | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [analyserData, setAnalyserData] = useState<Uint8Array | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const isSupported = typeof window !== 'undefined' 
    && typeof MediaRecorder !== 'undefined' 
    && navigator.mediaDevices?.getUserMedia !== undefined;

  // Cleanup function for audio context and animation
  const cleanupAudioContext = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserData(null);
  }, []);

  // Update analyser data on each frame
  const updateAnalyserData = useCallback(() => {
    if (!analyserRef.current || !isRecording) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    setAnalyserData(new Uint8Array(dataArray));
    
    animationFrameRef.current = requestAnimationFrame(updateAnalyserData);
  }, [isRecording]);

  // Start analyser updates when recording starts
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      updateAnalyserData();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, updateAnalyserData]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Tu navegador no soporta grabación de audio');
      return;
    }

    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context and analyser for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Try audio/webm first, fallback to default
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Use browser default
        }
      }
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        setAudioBlob(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Cleanup audio context
        cleanupAudioContext();
      };

      mediaRecorder.onerror = () => {
        setError('Error durante la grabación');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        cleanupAudioContext();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);
      
      // Timer to show duration
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      cleanupAudioContext();
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado. Por favor, permite el acceso en tu navegador.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No se encontró ningún micrófono. Conecta uno e inténtalo de nuevo.');
      } else {
        setError('Error al iniciar la grabación. Inténtalo de nuevo.');
        console.error('Recording error:', err);
      }
    }
  }, [isSupported, cleanupAudioContext]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setAnalyserData(null);
  }, []);

  return {
    isRecording,
    isSupported,
    audioBlob,
    error,
    duration,
    analyserData,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
