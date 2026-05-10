
import React, { useEffect, useState, useRef } from 'react';
import { VitalSign } from '../types';
import { AlertCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface VitalCardProps {
  vital: VitalSign;
  isLoading?: boolean;
}

const VitalCard: React.FC<VitalCardProps> = ({ vital, isLoading }) => {
  const getIdealRange = (label: string) => {
    switch(label) {
      case 'Heart Rate': return '60-100';
      case 'Blood Pressure': return '120/80';
      case 'Oxygen Sat.': return '95-100';
      case 'Temp.': return '36.5-37.5';
      default: return '--';
    }
  };

  const [isPulsing, setIsPulsing] = useState(false);
  const [displayValue, setDisplayValue] = useState<string | number>(getIdealRange(vital.label));
  const [status, setStatus] = useState<'normal' | 'warning' | 'critical'>('normal');
  const [diagnostic, setDiagnostic] = useState<string>('Ideal Range');
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) {
      setDisplayValue(getIdealRange(vital.label));
      setStatus('normal');
      setDiagnostic('Ideal Range');
    } else {
      setDisplayValue(vital.value);
      setStatus(vital.status as 'normal' | 'warning' | 'critical');
      setDiagnostic(vital.diagnostic);
    }
  }, [vital, isHovered]);

  useEffect(() => {
    if (status === 'critical') {
      const interval = setInterval(() => setIsPulsing(p => !p), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const checkStatus = (label: string, value: string | number) => {
    if (label === 'Heart Rate') {
      const v = Number(value);
      if (v >= 60 && v <= 100) return { s: 'normal', d: 'Normal Pulse' };
      return { s: 'critical', d: v > 100 ? 'Tachycardia' : 'Bradycardia' };
    }
    if (label === 'Blood Pressure') {
      const parts = String(value).split('/');
      const sys = Number(parts[0]);
      const dia = Number(parts[1]);
      if (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) return { s: 'normal', d: 'Optimal BP' };
      return { s: 'warning', d: 'Out of Range' };
    }
    if (label === 'Oxygen Sat.') {
      const v = Number(value);
      if (v >= 95 && v <= 100) return { s: 'normal', d: 'Normal Oxygenation' };
      return { s: 'critical', d: 'Hypoxia Warning' };
    }
    if (label === 'Temp.') {
      const v = Number(value);
      if (v >= 36.5 && v <= 37.5) return { s: 'normal', d: 'Afebrile' };
      return { s: 'critical', d: v > 37.5 ? 'Fever Detected' : 'Hypothermia' };
    }
    return { s: 'normal', d: 'Stable' };
  };

  const intervalRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    intervalRef.current = window.setInterval(() => {
      let nextVal: string | number = displayValue;
      if (vital.label === 'Heart Rate') {
        nextVal = Math.floor(Math.random() * (110 - 55) + 55);
      } else if (vital.label === 'Blood Pressure') {
        const s = Math.floor(Math.random() * (150 - 85) + 85);
        const d = Math.floor(Math.random() * (100 - 55) + 55);
        nextVal = `${s}/${d}`;
      } else if (vital.label === 'Oxygen Sat.') {
        nextVal = Math.floor(Math.random() * (100 - 92) + 92);
      } else if (vital.label === 'Temp.') {
        nextVal = Number((Math.random() * (39.0 - 35.5) + 35.5).toFixed(1));
      }
      
      const { s, d } = checkStatus(vital.label, nextVal);
      setDisplayValue(nextVal);
      setStatus(s as any);
      setDiagnostic(d);
    }, 800);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 animate-pulse">
        <div className="h-10 w-10 bg-gray-200 dark:bg-zinc-800 rounded-xl mb-4" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded-lg mb-2" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded-lg" />
      </div>
    );
  }

  const statusColors = {
    normal: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20',
    warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
    critical: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
  };

  const chartData = vital.trend.map((val, i) => ({ val, i }));

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
      bg-white dark:bg-zinc-900 p-5 rounded-3xl border transition-all duration-300 group flex flex-col h-full cursor-help
      ${status === 'critical' ? 'border-rose-200 dark:border-rose-900/50 shadow-lg shadow-rose-100 dark:shadow-none' : 'border-gray-100 dark:border-zinc-800 hover:border-teal-200 dark:hover:border-teal-900/40'}
    `}>
      <div className="flex justify-between items-start mb-4">
        <div className={`
          h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300
          ${statusColors[status]}
        `}>
          {status === 'critical' ? (
            <AlertCircle size={24} className={isPulsing ? 'animate-ping' : ''} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: vital.icon }} className="[&>svg]:w-7 [&>svg]:h-7" />
          )}
        </div>
        <div className="h-10 w-24 hidden sm:block opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="val" 
                stroke={status === 'critical' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : '#10b981'} 
                strokeWidth={2.5} 
                dot={false} 
              />
              <YAxis domain={['auto', 'auto']} hide />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-black dark:text-white tabular-nums tracking-tighter">{displayValue}</span>
          <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">{vital.unit}</span>
        </div>
        <p className="text-gray-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">{vital.label}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-50 dark:border-zinc-800 space-y-2">
        {diagnostic && (
          <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${statusColors[status]}`}>
            {diagnostic}
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalCard;
