import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

interface HardwareData {
  hr?: string;
  sys?: string;
  dia?: string;
  spo2?: string;
  live_spo2?: string;
  temp?: string;
  live_temp?: string;
  error?: string;
  timestamp: number;
}

interface HardwareContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
  error: string | null;
  hardwareData: HardwareData | null;
  setHardwareData: React.Dispatch<React.SetStateAction<HardwareData | null>>;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

export const HardwareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardwareData, setHardwareData] = useState<HardwareData | null>(null);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);

  const sendCommand = useCallback(async (command: string) => {
    try {
      if (!portRef.current || !writerRef.current) {
        throw new Error('Serial port is not connected.');
      }
      // TextEncoderStream writer expects a string directly
      await writerRef.current.write(command + '\n');
      console.log(`[Serial TX] ${command}`);
    } catch (err: any) {
      console.error('Failed to send command:', err);
      setError(err.message || 'Failed to send command');
    }
  }, []);

  const connect = async () => {
    try {
      if (!('serial' in navigator)) {
        setError('Web Serial API not supported. Use Chrome or Edge.');
        alert('Web Serial API is not supported in this browser.\n\nPlease use Google Chrome or Microsoft Edge.');
        return;
      }

      // Request port — try with common USB-UART chip filters first,
      // fallback to showing all available ports
      // @ts-ignore
      let port;
      try {
        // @ts-ignore
        port = await navigator.serial.requestPort({
          filters: [
            { usbVendorId: 0x10C4 }, // CP2102 / CP2104 (Silicon Labs)
            { usbVendorId: 0x1A86 }, // CH340 / CH341
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x2341 }, // Arduino
            { usbVendorId: 0x303A }, // Espressif (ESP32-S2/S3 native USB)
          ]
        });
      } catch (filterErr: any) {
        if (filterErr.name === 'NotFoundError') {
          // No matching filtered port — retry without filters to show ALL ports
          // @ts-ignore
          port = await navigator.serial.requestPort();
        } else {
          throw filterErr;
        }
      }
      
      try {
        await port.open({ baudRate: 115200 });
        
        // Toggle DTR/RTS to cleanly reset ESP32 upon connection. 
        // This resolves the SpO2 sensor initialization issue where it hangs on first connect.
        try {
          await port.setSignals({ dataTerminalReady: false, requestToSend: false });
          await new Promise(resolve => setTimeout(resolve, 200));
          await port.setSignals({ dataTerminalReady: true, requestToSend: true });
          
          // Wait 3 seconds for the ESP32 to fully reboot and initialize ALL sensors
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (signalErr) {
          console.warn('Failed to set DTR/RTS signals. Continuing anyway.', signalErr);
        }
      } catch (e: any) {
        if (e.message.includes('already open')) {
           console.log('Port is already open, continuing...');
        } else {
           throw e;
        }
      }

      portRef.current = port;

      // Set up writer
      // @ts-ignore
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
      writerRef.current = textEncoder.writable.getWriter();

      setIsConnected(true);
      setError(null);

      // Set up reader
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
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmed = line.trim();
            console.log(`[Serial RX] ${trimmed}`);
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const data = JSON.parse(trimmed);
                // Update hardware data with whatever fields come in
                setHardwareData({
                  hr: data.hr?.toString() || '',
                  sys: data.sys?.toString() || '',
                  dia: data.dia?.toString() || '',
                  spo2: data.spo2?.toString() || '',
                  live_spo2: data.live_spo2?.toString() || '',
                  temp: data.temp?.toString() || '',
                  live_temp: data.live_temp?.toString() || '',
                  error: data.error?.toString() || '',
                  timestamp: Date.now()
                });
              } catch (e) {
                console.warn('Failed to parse serial JSON data', trimmed);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
         setError(err.message || 'Failed to connect to Serial Port');
      }
      setIsConnected(false);
    }
  };

  const disconnect = async () => {
    try {
      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      setIsConnected(false);
      setHardwareData(null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return (
    <HardwareContext.Provider value={{
      isConnected,
      connect,
      disconnect,
      sendCommand,
      error,
      hardwareData,
      setHardwareData
    }}>
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => {
  const context = useContext(HardwareContext);
  if (context === undefined) {
    throw new Error('useHardware must be used within a HardwareProvider');
  }
  return context;
};
