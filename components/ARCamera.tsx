'use client';

import { useEffect, useRef, useState } from 'react';

interface ARCameraProps {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

export default function ARCamera({ onStreamReady, onError }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream;
          setHasPermission(true);
          setError(null);
          onStreamReady?.(stream);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to access camera. Please grant camera permissions.';
        setError(errorMessage);
        setHasPermission(false);
        onError?.(errorMessage);
      }
    };

    startCamera();

      // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        streamRef.current = null;
      }
    };
  }, []); // Empty deps - callbacks are stable or use refs

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
        <div className="text-center p-4">
          <p className="text-lg font-semibold mb-2">Camera Access Required</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
        <div className="text-center p-4">
          <p className="text-lg font-semibold mb-2">Camera Permission Denied</p>
          <p className="text-sm">Please enable camera access in your browser settings.</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 w-full h-full object-cover"
      style={{ zIndex: 0 }}
    />
  );
}

