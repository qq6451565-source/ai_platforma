/**
 * Hook for managing face verification via WebSocket
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { message } from 'antd';

export interface FaceVerificationResult {
  verified: boolean;
  confidence?: number;
  faces_detected: number;
  event_type: string;
  message: string;
  alert?: boolean;
}

interface UseFaceVerificationOptions {
  roomName: string;
  enabled?: boolean;
  interval?: number; // seconds
  onVerificationResult?: (result: FaceVerificationResult) => void;
  onSessionStarted?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useFaceVerification = ({
  roomName,
  enabled = true,
  interval = 5,
  onVerificationResult,
  onSessionStarted,
  onError,
}: UseFaceVerificationOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastResult, setLastResult] = useState<FaceVerificationResult | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [hasReference, setHasReference] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  /**
   * Get WebSocket URL
   */
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_URL || window.location.host;
    const token = localStorage.getItem('access_token');
    return `${protocol}//${host}/ws/face-verify/${roomName}/?token=${token}`;
  }, [roomName]);

  /**
   * Capture frame from video
   */
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  /**
   * Send frame for verification
   */
  const verifyFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!hasReference) return; // Don't verify if no reference embedding

    const frameData = captureFrame();
    if (!frameData) return;

    wsRef.current.send(JSON.stringify({
      type: 'verify_frame',
      frame_data: frameData,
      timestamp: new Date().toISOString(),
    }));
  }, [captureFrame, hasReference]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('Face verification WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'session_started':
              setSessionId(data.session_id);
              setHasReference(data.has_reference);
              onSessionStarted?.(data);
              if (!data.has_reference) {
                message.warning('No reference face embedding found. Please complete registration.');
              }
              break;

            case 'verification_result':
              const result: FaceVerificationResult = {
                verified: data.verified,
                confidence: data.confidence,
                faces_detected: data.faces_detected,
                event_type: data.event_type,
                message: data.message,
                alert: data.alert,
              };
              setLastResult(result);
              onVerificationResult?.(result);

              if (data.alert) {
                message.warning(data.message);
              }
              break;

            case 'alert':
              message.error(`Alert: ${data.message}`);
              break;

            case 'error':
              onError?.(data.message);
              message.error(data.message);
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        onError?.('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('Face verification WebSocket closed');
        setIsConnected(false);
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (enabled) connect();
        }, 3000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      onError?.('Failed to connect');
    }
  }, [enabled, getWebSocketUrl, onVerificationResult, onSessionStarted, onError]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Initialize camera and start verification
   */
  const startVerification = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start periodic verification
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(verifyFrame, interval * 1000);
    } catch (error) {
      console.error('Failed to access camera:', error);
      message.error('Failed to access camera. Please grant permission.');
      onError?.('Camera access denied');
    }
  }, [interval, verifyFrame, onError]);

  /**
   * Stop verification and release camera
   */
  const stopVerification = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Start verification when connected and has reference
  useEffect(() => {
    if (isConnected && hasReference) {
      startVerification();
    }

    return () => {
      stopVerification();
    };
  }, [isConnected, hasReference, startVerification, stopVerification]);

  return {
    isConnected,
    sessionId,
    hasReference,
    lastResult,
    videoRef,
    canvasRef,
    verifyFrame,
    startVerification,
    stopVerification,
  };
};
