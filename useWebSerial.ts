import { useState, useRef, useEffect } from 'react';

export const useWebSerial = (onDataReceived: (data: any) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);

  const connect = async () => {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
      }

      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 }); // ESP32 common baud rate
      portRef.current = port;
      setIsConnected(true);
      setError(null);

      // @ts-ignore
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the incomplete line in the buffer
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const data = JSON.parse(trimmed);
                onDataReceived(data);
              } catch (e) {
                console.warn('Failed to parse serial JSON data', trimmed);
              }
            }
          }
        }
      }
    } catch (err: any) {
      // User might cancel the prompt, or it might be occupied
      if (err.name !== 'NotFoundError') {
         setError(err.message || 'Failed to connect to Serial Port');
      }
      setIsConnected(false);
    }
  };

  const disconnect = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      setIsConnected(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return { isConnected, connect, disconnect, error };
};
