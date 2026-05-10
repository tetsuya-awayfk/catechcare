
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from './services/api';

interface AlarmContextValue {
  notifications: any[];
  refreshAlarms: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextValue>({
  notifications: [],
  refreshAlarms: async () => {},
});

export const useAlarms = () => useContext(AlarmContext);

export const AlarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAlarms = useCallback(async () => {
    try {
      const alarms = await api.getAlarms();
      setNotifications(alarms.filter((a: any) => !a.is_acknowledged));
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  useEffect(() => {
    // Fetch immediately on mount
    refreshAlarms();

    // Then poll every 30 seconds as a fallback (for cross-session updates)
    intervalRef.current = setInterval(refreshAlarms, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshAlarms]);

  return (
    <AlarmContext.Provider value={{ notifications, refreshAlarms }}>
      {children}
    </AlarmContext.Provider>
  );
};
