
import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle2, Trash2, Clock, User, Filter, X, Search, Loader2 } from 'lucide-react';
import { Alert } from '../types';
import { api } from '../services/api';
import { useAlarms } from '../AlarmContext';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { refreshAlarms } = useAlarms();

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    fetchAlarms();
  }, []);

  const fetchAlarms = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAlarms();
      // Map VitalSignRecord to Alert UI format
      const mappedAlerts = data.map((v: any) => {
        let severity = 'Low';
        let msgs = [];
        let maxSeverityValue = 0; // 0=Low, 1=Medium, 2=High, 3=Critical, 4=Error
        
        const setSeverity = (level: string, value: number) => {
          if (value > maxSeverityValue) {
            maxSeverityValue = value;
            severity = level;
          }
        };

        if (v.heart_rate < 60 || v.heart_rate > 100) { msgs.push(`HR: ${v.heart_rate} BPM`); setSeverity('High', 2); }
        if (v.blood_pressure_systolic > 120 || v.blood_pressure_systolic < 90 || v.blood_pressure_diastolic > 80 || v.blood_pressure_diastolic < 60) { msgs.push(`BP: ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`); setSeverity('High', 2); }
        if (v.oxygen_saturation < 95) { msgs.push(`SpO2: ${v.oxygen_saturation}%`); setSeverity('Critical', 3); }
        
        // Temperature severity: 36.5-37.5 Normal, 38-39 High, 40-42 Critical, Beyond = Error
        const temp = v.body_temperature;
        if (temp < 36.5) { msgs.push(`Temp: ${temp}°C (Low)`); setSeverity('Low', 0); }
        else if (temp >= 38 && temp < 40) { msgs.push(`Temp: ${temp}°C (High)`); setSeverity('High', 2); }
        else if (temp >= 40 && temp <= 42) { msgs.push(`Temp: ${temp}°C (Critical)`); setSeverity('Critical', 3); }
        else if (temp > 42) { msgs.push(`Temp: ${temp}°C (Error)`); setSeverity('Error', 4); }

        return {
          id: v.id.toString(),
          severity,
          patientName: v.patient_name,
          message: `Abnormal Vitals Detected: ${msgs.join(' | ')}`,
          timestamp: new Date(v.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isAcknowledged: v.is_acknowledged
        };
      });
      
      const severityOrder: any = { 'Error': 0, 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
      mappedAlerts.sort((a: any, b: any) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      setAlerts(mappedAlerts);
    } catch (error) {
      console.error("Failed to fetch alarms", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeAlarm(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isAcknowledged: true } : a));
      triggerToast('Alert successfully acknowledged');
      refreshAlarms(); // Remove from notification bell immediately
    } catch(e) { triggerToast('Failed to acknowledge alert'); }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.deleteAlarm(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      triggerToast('Alert permanently removed');
    } catch(e) { triggerToast('Failed to delete alert'); }
  };

  const acknowledgeAll = async () => {
    try {
      const unAckCount = alerts.filter(a => !a.isAcknowledged).length;
      if (unAckCount === 0) return;
      await api.acknowledgeAllAlarms();
      setAlerts(prev => prev.map(a => ({ ...a, isAcknowledged: true })));
      triggerToast(`${unAckCount} alerts marked as acknowledged`);
      refreshAlarms(); // Clear notification bell immediately
    } catch(e) { triggerToast('Failed to acknowledge all'); }
  };

  const severityStyles: any = {
    Error: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
    Critical: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    High: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
    Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    Low: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black dark:text-white flex items-center gap-3 tracking-tighter uppercase">
            <Bell className="text-[#022FFC]" /> Clinical Alerts
          </h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 font-medium">Manage institutional physiological monitoring events.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
           <button 
             onClick={() => setShowFilterModal(true)}
             className="flex-1 sm:flex-none px-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[#022FFC] transition-all hover:bg-blue-50 active:scale-95"
           >
             <Filter size={14} /> Filter
           </button>
           <button 
             onClick={acknowledgeAll}
             className="flex-1 sm:flex-none px-6 py-2.5 bg-[#022FFC] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
           >
             Acknowledge All
           </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 mt-8 flex flex-col items-center justify-center">
            <Loader2 size={48} className="text-[#022FFC] animate-spin mb-4" />
            <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">Syncing Alarms</h3>
            <p className="text-gray-500 font-medium">Fetching active alerts from the institutional database.</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-lg font-black dark:text-white uppercase tracking-tighter">All Clear</h3>
            <p className="text-gray-500 font-medium">No active alerts requiring attention.</p>
          </div>
        ) : (
          alerts
            .filter((alert) => activeSeverityFilter ? alert.severity === activeSeverityFilter : true)
            .map((alert) => (
            <div 
              key={alert.id}
              className={`
                bg-white dark:bg-zinc-900 border rounded-[1.5rem] p-5 transition-all animate-in slide-in-from-left-4 duration-300
                ${alert.isAcknowledged ? 'opacity-60 grayscale border-gray-100 dark:border-zinc-800' : 'border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md'}
              `}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className={`
                  h-14 w-14 rounded-2xl flex items-center justify-center shrink-0
                  ${severityStyles[alert.severity]}
                `}>
                  <ShieldAlert size={28} className={!alert.isAcknowledged && (alert.severity === 'Critical' || alert.severity === 'Error') ? 'animate-pulse' : ''} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${severityStyles[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 font-black flex items-center gap-1 uppercase tracking-widest">
                      <Clock size={12} /> {alert.timestamp}
                    </span>
                  </div>
                  <h3 className="font-black dark:text-white text-base truncate tracking-tight">{alert.message}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <User size={12} className="text-gray-400" />
                    <span className="text-xs font-bold text-[#022FFC] dark:text-zinc-400">{alert.patientName}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!alert.isAcknowledged ? (
                    <button 
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-5 py-2.5 bg-[#022FFC] hover:opacity-90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2 active:scale-95"
                    >
                      <CheckCircle2 size={14} /> Acknowledge
                    </button>
                  ) : (
                    <div className="px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                      <CheckCircle2 size={14} /> Synchronized
                    </div>
                  )}
                  <button 
                    onClick={() => handleRemove(alert.id)}
                    className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all group"
                  >
                    <Trash2 size={20} className="group-active:scale-90 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowFilterModal(false)}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black dark:text-white tracking-tighter">Filter Alerts</h3>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
             </div>
             <div className="space-y-8">
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Severity Levels</p>
                   <div className="flex flex-wrap gap-2">
                     {['Error', 'Critical', 'High', 'Medium', 'Low'].map(lvl => (
                       <button 
                          key={lvl} 
                          onClick={() => setActiveSeverityFilter(activeSeverityFilter === lvl ? null : lvl)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 uppercase tracking-widest ${
                            activeSeverityFilter === lvl
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-500 shadow-md shadow-blue-500/10'
                              : 'bg-gray-50 dark:bg-zinc-800 dark:text-white border-transparent hover:border-blue-500'
                          }`}
                        >
                         {lvl}
                       </button>
                     ))}
                   </div>
                </div>
                <div className="space-y-3">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Institutional Search</p>
                   <div className="relative">
                     <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input type="text" placeholder="Patient name or ID..." className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl py-3 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-white" />
                   </div>
                </div>
                <button 
                  onClick={() => { setShowFilterModal(false); triggerToast('Applied 2 alert filters'); }}
                  className="w-full py-4 bg-[#022FFC] text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                >
                  Apply Criteria
                </button>
             </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-[#022FFC] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-blue-400">
            <CheckCircle2 size={24} />
            <div className="text-left">
              <p className="font-black text-xs uppercase tracking-widest">Protocol Update</p>
              <p className="text-[10px] opacity-80 font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
