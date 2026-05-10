
import React, { useState, useEffect, useRef } from 'react';
import VitalCard from '../components/VitalCard';
import { VitalSign, PatientCategory } from '../types';
import { Clock, Plus, CheckCircle2, Loader2, X, Search, Thermometer, Droplets, AlertCircle, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { useHardware } from '../HardwareContext';

export const getBPCategory = (sys: number, dia: number) => {
  if (sys > 180 || dia > 120) return { label: 'HYPERTENSIVE CRISIS', status: 'critical' };
  if (sys >= 140 || dia >= 90) return { label: 'HYPERTENSION STAGE 2', status: 'critical' };
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { label: 'HYPERTENSION STAGE 1', status: 'warning' };
  if (sys >= 120 && sys <= 129 && dia < 80) return { label: 'ELEVATED', status: 'warning' };
  if (sys < 120 && dia < 80) return { label: 'NORMAL', status: 'normal' };
  return { label: 'UNKNOWN', status: 'normal' };
};

export const getTempCategory = (temp: number) => {
  if (temp < 35.0) return { label: 'HYPOTHERMIA', status: 'warning' };
  if (temp <= 37.2) return { label: 'NORMAL', status: 'normal' };
  if (temp <= 38.2) return { label: 'LOW-GRADE FEVER', status: 'warning' };
  if (temp <= 39.2) return { label: 'MODERATE FEVER', status: 'warning' };
  if (temp <= 41.0) return { label: 'HIGH-GRADE FEVER', status: 'critical' };
  return { label: 'HYPERPYREXIA', status: 'critical' };
};

export const getSpo2Category = (spo2: number) => {
  if (spo2 >= 95) return { label: 'NORMAL', status: 'normal' };
  if (spo2 >= 90) return { label: 'BELOW NORMAL', status: 'warning' };
  if (spo2 < 85) return { label: 'SEVERE HYPOXEMIA', status: 'critical' };
  return { label: 'LOW (HYPOXEMIA)', status: 'warning' };
};

export const getHRCategory = (hr: number) => {
  if (hr < 60) return { label: 'BRADYCARDIA', status: 'warning' };
  if (hr <= 100) return { label: 'NORMAL', status: 'normal' };
  return { label: 'TACHYCARDIA', status: 'warning' };
};

const Dashboard: React.FC = () => {
  const [vitals, setVitals] = useState<VitalSign[]>([
    { id: '1', label: 'Heart Rate', value: '--', unit: 'BPM', status: 'normal', diagnostic: 'Loading...', trend: [0, 0, 0, 0, 0], icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' },
    { id: '2', label: 'Blood Pressure', value: '--/--', unit: 'mmHg', status: 'normal', diagnostic: 'Loading...', trend: [0, 0, 0, 0, 0], icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
    { id: '3', label: 'Oxygen Sat.', value: '--', unit: '%', status: 'normal', diagnostic: 'Loading...', trend: [0, 0, 0, 0, 0], icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.8 4-4 0-3.3-4-8-4-8s-4 4.7-4 8c0 2.2 1.8 4 4 4Z"/><path d="M17 20.3c2.2 0 4-1.8 4-4 0-3.3-4-8-4-8s-4 4.7-4 8c0 2.2 1.8 4 4 4Z"/></svg>' },
    { id: '4', label: 'Temp.', value: '--', unit: '°C', status: 'normal', diagnostic: 'Loading...', trend: [0, 0, 0, 0, 0], icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>' },
  ]);

  const [recentEncounters, setRecentEncounters] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVitalCheckModal, setShowVitalCheckModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState<boolean>(false);

  // New Form states
  const [formCategory, setFormCategory] = useState<string>('STUDENT');
  const [formBirthDate, setFormBirthDate] = useState<string>('');
  const [formInstId, setFormInstId] = useState<string>('');
  const [formInstIdPlaceholder, setFormInstIdPlaceholder] = useState<string>('e.g. S123456');

  // New Batch 2 Form states
  const [formSuffix, setFormSuffix] = useState<string>('');
  const [formCourse, setFormCourse] = useState<string>('');
  const [formYearLevel, setFormYearLevel] = useState<string>('');
  const [formCivilStatus, setFormCivilStatus] = useState<string>('');
  const [formHr, setFormHr] = useState('');
  const [formBp, setFormBp] = useState('');
  const [formSpo2, setFormSpo2] = useState('');
  const [formTemp, setFormTemp] = useState('');

  const { isConnected, hardwareData, sendCommand, error: serialError } = useHardware();
  const [gatheringStep, setGatheringStep] = useState<'IDLE' | 'SPO2' | 'TEMP' | 'DONE'>('IDLE');
  const prevHardwareTimestamp = useRef<number>(0);
  const [liveSpo2, setLiveSpo2] = useState('');
  const [liveTemp, setLiveTemp] = useState('');

  const handleGetSpo2 = async () => {
    setGatheringStep('SPO2');
    setLiveSpo2('');
    prevHardwareTimestamp.current = hardwareData?.timestamp || 0;
    await sendCommand('GET_SPO2');
  };

  const handleGetTemp = async () => {
    setGatheringStep('TEMP');
    setLiveTemp('');
    prevHardwareTimestamp.current = hardwareData?.timestamp || 0;
    await sendCommand('GET_TEMP');
  };

  // Listen for hardware data — show live readings then capture final
  useEffect(() => {
    if (!hardwareData || hardwareData.timestamp <= prevHardwareTimestamp.current) return;
    prevHardwareTimestamp.current = hardwareData.timestamp;

    if (hardwareData.error) {
      if (gatheringStep === 'SPO2') setLiveSpo2('Error');
      if (gatheringStep === 'TEMP') setLiveTemp('Error');
      setTimeout(() => setGatheringStep('IDLE'), 2000);
      return;
    }

    if (gatheringStep === 'SPO2') {
      if (hardwareData.spo2) {
        setLiveSpo2(hardwareData.spo2);
        setFormSpo2(hardwareData.spo2);
        setGatheringStep('IDLE');
      } else if (hardwareData.live_spo2) {
        setLiveSpo2(hardwareData.live_spo2);
      }
    } else if (gatheringStep === 'TEMP') {
      if (hardwareData.temp) {
        setLiveTemp(hardwareData.temp);
        setFormTemp(hardwareData.temp);
        setGatheringStep('DONE');
      } else if (hardwareData.live_temp) {
        setLiveTemp(hardwareData.live_temp);
      }
    }
  }, [hardwareData, gatheringStep]);

  // Sync HR to hardware LCD when changed
  useEffect(() => {
    if (isConnected && formHr) {
      sendCommand(`SET_HR:${formHr}`);
    }
  }, [formHr, isConnected]);

  // Sync BP to hardware LCD when changed
  useEffect(() => {
    if (isConnected && formBp) {
      sendCommand(`SET_BP:${formBp}`);
    }
  }, [formBp, isConnected]);

  const resetHardwareState = () => {
    setGatheringStep('IDLE');
    setLiveSpo2('');
    setLiveTemp('');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summary, recent] = await Promise.all([
        api.getDashboardSummary(),
        api.getRecentVitals()
      ]);
      
      setStats(summary);
      setRecentEncounters(Array.isArray(recent) ? recent : []);
      
      // Update the 4 main vital cards with averages or latest global data
      if (summary) {
        const hr = Math.round(Number(summary.avg_heart_rate) || 0) || 72;
        const hrCat = getHRCategory(hr);
        
        const sys = 118; // Default mock for system average since API only gives HR and Temp
        const dia = 78;
        const bpCat = getBPCategory(sys, dia);
        
        const spo2 = 98;
        const spo2Cat = getSpo2Category(spo2);
        
        const temp = Number(summary.avg_temp) || 36.8;
        const tempCat = getTempCategory(temp);

        setVitals(prev => [
          { ...prev[0], value: hr, diagnostic: hrCat.label, status: hrCat.status as any },
          { ...prev[1], value: `${sys}/${dia}`, diagnostic: bpCat.label, status: bpCat.status as any },
          { ...prev[2], value: spo2, diagnostic: spo2Cat.label, status: spo2Cat.status as any },
          { ...prev[3], value: temp.toFixed(1), diagnostic: tempCat.label, status: tempCat.status as any },
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseVitalCheckModal = () => {
    setShowConfirmCancelModal(true);
  };

  const confirmCancel = () => {
    setShowVitalCheckModal(false);
    setShowConfirmCancelModal(false);
  };

  const handleVitalCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      is_register: true,
      patient_id: formData.get('patient_id') as string,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('surname') as string,
      middle_initial: formData.get('mi') as string,
      suffix: formSuffix,
      category: formCategory,
      birth_date: formBirthDate.includes('/') ? `${formBirthDate.split('/')[2]}-${formBirthDate.split('/')[0].padStart(2, '0')}-${formBirthDate.split('/')[1].padStart(2, '0')}` : formBirthDate,
      sex: formData.get('sex') as string,
      civil_status: formCivilStatus || null,
      course: formCategory === 'STUDENT' ? formCourse : '',
      year_level: formCategory === 'STUDENT' ? formYearLevel : '',
      heart_rate: parseInt(formData.get('hr') as string),
      blood_pressure_systolic: parseInt((formData.get('bp') as string).split('/')[0]),
      blood_pressure_diastolic: parseInt((formData.get('bp') as string).split('/')[1]),
      oxygen_saturation: parseFloat(formData.get('spo2') as string),
      body_temperature: parseFloat(formData.get('temp') as string),
    };

    try {
      await api.addVitals(data);
      if (isConnected) {
        sendCommand('RESET_LCD');
      }
      setShowVitalCheckModal(false);
      setShowToast(true);
      fetchDashboardData(); // Refresh data
      setTimeout(() => setShowToast(false), 3000);
    } catch (error: any) {
      console.error("Failed to add vitals", error);
      setFormError(error.message || "Failed to register patient");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-compute Age
  const computedAge = React.useMemo(() => {
    if (!formBirthDate) return '';
    const birthDateObj = new Date(formBirthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  }, [formBirthDate]);

  // Handle Category Change & Auto ID
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setFormCategory(newCat);
    
    // Generate an ID placeholder based on category
    let prefix = 'S';
    if (newCat === 'TEACHING_STAFF') prefix = 'F';
    else if (newCat === 'NON_TEACHING_STAFF') prefix = 'A';
    
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    setFormInstIdPlaceholder(`e.g. ${prefix}${randomDigits}`);
  };
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    
    if (val.length > 4) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length > 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    
    setFormBirthDate(val);
  };

  // When modal opens, reset states
  const handleOpenModal = () => {
    setFormError(null);
    setFormCategory('STUDENT');
    setFormBirthDate('');
    setFormInstId('');
    setFormSuffix('');
    setFormCourse('');
    setFormYearLevel('');
    setFormCivilStatus('');
    setFormHr('');
    setFormBp('');
    setFormSpo2('');
    setFormTemp('');
    resetHardwareState();
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    setFormInstIdPlaceholder(`e.g. S${randomDigits}`);
    setShowVitalCheckModal(true);
  };


  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black dark:text-white tracking-tighter">Clinic Dashboard</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm flex items-center gap-2 mt-1 font-medium">
            <Clock size={14} /> System Time: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleOpenModal} className="flex-1 md:flex-none px-6 py-3 bg-[#022FFC] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-blue-500/20 active:scale-95">
            <Plus size={18} /> Register Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vitals.map(vital => (
          <VitalCard key={vital.id} vital={vital} isLoading={isLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 p-6 md:p-8 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black dark:text-white tracking-tight uppercase text-xs text-gray-400">New Health Encounters</h3>
          </div>
          <div className="overflow-x-auto -mx-6 md:-mx-8">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-50 dark:border-zinc-800 text-[10px] text-gray-400 dark:text-zinc-500 font-black uppercase tracking-widest">
                  <th className="pb-4 px-8">Full Name</th>
                  <th className="pb-4 px-4">Category</th>
                  <th className="pb-4 px-4">Latest BP</th>
                  <th className="pb-4 px-4">Heart Rate</th>
                  <th className="pb-4 px-4">Oxygen Sat.</th>
                  <th className="pb-4 px-4">Body Temp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                {Array.isArray(recentEncounters) && recentEncounters.slice(0, 10).map((v) => (
                  <tr key={v.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-4 px-8 whitespace-nowrap">
                      <p className="text-sm font-bold dark:text-white leading-tight">{v.patient_name}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest bg-blue-50 text-[#022FFC] dark:bg-blue-900/20`}>
                        {v.patient_category === 'NON_TEACHING_STAFF' ? 'NON-TEACHING STAFF' : v.patient_category?.replace('_', ' ') || 'Student'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-black tabular-nums dark:text-zinc-200 whitespace-nowrap">{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}</td>
                    <td className="py-4 px-4 text-sm font-black tabular-nums dark:text-zinc-200 whitespace-nowrap">{v.heart_rate} BPM</td>
                    <td className="py-4 px-4 text-sm font-black tabular-nums dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap">
                      <Droplets size={12} className="text-blue-500" /> {v.oxygen_saturation}%
                    </td>
                    <td className="py-4 px-4 text-sm font-black tabular-nums dark:text-zinc-200 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Thermometer size={12} className={v.body_temperature >= 38 ? 'text-rose-500' : 'text-emerald-500'} />
                        {v.body_temperature}°C
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="self-start bg-[#022FFC] dark:bg-zinc-950 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group transition-colors duration-300">
          <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
          <div>
            <h3 className="font-black text-xl mb-2 tracking-tighter">Clinic Statistics</h3>
            <p className="text-blue-100 dark:text-zinc-400 text-sm font-medium">Monthly health monitoring utilization across institution roles.</p>
          </div>
          <div className="space-y-6 mt-10">
            {stats?.category_breakdown?.length > 0 ? (
              stats.category_breakdown.map((item: any) => (
                <div key={item.category}>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-2 tracking-widest">
                    <span className="text-blue-200 dark:text-zinc-500">{item.category.replace(/_/g, ' ')}</span>
                    <span className="text-white dark:text-teal-400">{item.count} Today</span>
                  </div>
                  <div className="h-1.5 bg-blue-900/40 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white dark:bg-teal-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (item.count / (stats.today_vitals_count || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">No activity recorded today</p>
              </div>
            )}
          </div>
          <div className="mt-10 p-5 bg-white/10 dark:bg-zinc-900/50 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black text-rose-300 dark:text-rose-500 uppercase tracking-widest mb-2">Attention Required</p>
            {stats?.alert_count > 0 ? (
              <p className="text-xs text-white/80 dark:text-zinc-400 leading-relaxed font-bold">
                {stats.alert_count} recent encounter{stats.alert_count === 1 ? '' : 's'} flagged for abnormal vital signs. Please review the Alarm list.
              </p>
            ) : (
              <p className="text-xs text-emerald-300/80 dark:text-emerald-500/80 leading-relaxed font-bold">
                No active alarms! All recorded vitals are currently within stable biological thresholds.
              </p>
            )}
          </div>
        </div>
      </div>

      {showVitalCheckModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => handleCloseVitalCheckModal()} />
          <div className="bg-white dark:bg-[#09090b] rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-xl relative z-10 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black dark:text-white tracking-tighter flex items-center gap-2">
                <UserPlus size={24} className="text-[#022FFC]" />
                Register New Patient
              </h3>
              <button onClick={handleCloseVitalCheckModal} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400"><X size={20} /></button>
            </div>

            {/* LCD Display */}
            <div className="mb-6 bg-[#1a2332] rounded-2xl p-5 border border-[#2a3a4f] shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">20×4 LCD Display</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {isConnected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="bg-[#0a1628] rounded-xl p-4 font-mono text-sm leading-relaxed border border-[#1a2a3f] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                <p className="text-[#4ade80]"><span className="text-zinc-500">HR:</span>   {formHr ? `${formHr} bpm` : '-- bpm'}</p>
                <p className="text-[#4ade80]"><span className="text-zinc-500">BP:</span>   {formBp ? `${formBp} mm Hg` : '--/-- mm Hg'}</p>
                <p className={gatheringStep === 'SPO2' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">SpO2:</span> {formSpo2 ? `${formSpo2}%` : gatheringStep === 'SPO2' && liveSpo2 ? `${liveSpo2}%` : '--%'}</p>
                <p className={gatheringStep === 'TEMP' ? 'text-[#facc15] animate-pulse' : 'text-[#4ade80]'}><span className="text-zinc-500">TEMP:</span> {formTemp ? `${formTemp}°C` : gatheringStep === 'TEMP' && liveTemp ? `${liveTemp}°C` : '--°C'}</p>
              </div>
            </div>

            {/* Hardware Integration Controls */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#022FFC] dark:text-teal-400">Sensor Acquisition</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 font-medium">Acquire SpO2 & Temp sequentially from connected station</p>
                  {serialError && <p className="text-xs text-rose-500 font-bold mt-1">{serialError}</p>}
                  {!isConnected && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">⚠️ Connect station first</p>}
                </div>
              </div>
              <div className="flex gap-2">
                {/* Step 1: Get SpO2 */}
                <button 
                  type="button" 
                  onClick={handleGetSpo2}
                  disabled={!isConnected || gatheringStep === 'SPO2'}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    formSpo2 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 cursor-pointer'
                      : gatheringStep === 'SPO2'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse'
                        : isConnected 
                          ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' 
                          : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {gatheringStep === 'SPO2' ? (
                    <><Loader2 size={12} className="animate-spin" /> {liveSpo2 ? `${liveSpo2}%` : 'Reading...'}</>
                  ) : formSpo2 ? (
                    <><CheckCircle2 size={12} /> {formSpo2}%</>
                  ) : (
                    <><Droplets size={12} /> Get SpO2</>
                  )}
                </button>
                {/* Step 2: Get Temperature */}
                <button 
                  type="button" 
                  onClick={handleGetTemp}
                  disabled={!isConnected || !formSpo2 || gatheringStep === 'TEMP'}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    formTemp 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 cursor-pointer'
                      : gatheringStep === 'TEMP'
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse'
                        : isConnected && formSpo2 
                          ? 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20' 
                          : 'bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  {gatheringStep === 'TEMP' ? (
                    <><Loader2 size={12} className="animate-spin" /> {liveTemp ? `${liveTemp}°C` : 'Reading...'}</>
                  ) : formTemp ? (
                    <><CheckCircle2 size={12} /> {formTemp}°C</>
                  ) : (
                    <><Thermometer size={12} /> Get Temp</>
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleVitalCheck} className="space-y-5">
              {formError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
                  <X size={16} /> {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Patient ID</label>
                  <input name="patient_id" required type="text" pattern="^[SFA]\d{6}$" maxLength={7} value={formInstId} onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setFormInstId(val);
                    if (val.startsWith('S')) setFormCategory('STUDENT');
                    else if (val.startsWith('F')) setFormCategory('TEACHING_STAFF');
                    else if (val.startsWith('A')) setFormCategory('NON_TEACHING_STAFF');
                  }} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none uppercase" placeholder={formInstIdPlaceholder} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
                  <select name="category" required value={formCategory} onChange={handleCategoryChange} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer">
                    <option value="STUDENT">Student</option>
                    <option value="TEACHING_STAFF">Teaching Staff</option>
                    <option value="NON_TEACHING_STAFF">Non-Teaching Staff</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Last Name</label>
                  <input name="surname" required type="text" className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">First Name</label>
                  <input name="first_name" required type="text" className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">M.I.</label>
                  <input name="mi" type="text" maxLength={1} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-3 text-sm dark:text-white font-bold text-center outline-none" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Suffix</label>
                    <select value={formSuffix} onChange={e => setFormSuffix(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-2 text-xs dark:text-white font-bold text-center outline-none appearance-none cursor-pointer">
                      <option value="">-</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300">
                <div className={`space-y-1.5 ${formCategory !== 'STUDENT' ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Course Program</label>
                  <select disabled={formCategory !== 'STUDENT'} required={formCategory === 'STUDENT'} value={formCourse} onChange={e => setFormCourse(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed text-ellipsis">
                    <option value="">Select Course...</option>
                    <optgroup label="Engineering">
                      <option value="BSEE">BSEE</option>
                      <option value="BSECE">BSECE</option>
                      <option value="BSCpE">BSCpE</option>
                      <option value="BET Auto.">BET Auto.</option>
                      <option value="BET Elec.">BET Elec.</option>
                    </optgroup>
                    <optgroup label="Information Technology">
                      <option value="BSIT">BSIT</option>
                      <option value="BSCS">BSCS</option>
                      <option value="ACT">ACT</option>
                    </optgroup>
                    <optgroup label="Business Administration">
                      <option value="BSFM">BSFM</option>
                      <option value="BSMM">BSMM</option>
                    </optgroup>
                  </select>
                </div>
                <div className={`space-y-1.5 ${formCategory !== 'STUDENT' ? 'opacity-50' : ''}`}>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Year Level</label>
                  <select disabled={formCategory !== 'STUDENT'} required={formCategory === 'STUDENT'} value={formYearLevel} onChange={e => setFormYearLevel(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer disabled:cursor-not-allowed">
                    <option value="">Select Year...</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr] gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Birth Date</label>
                  <input name="birth_date" required type="text" pattern="(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/\d{4}" value={formBirthDate} onChange={handleBirthDateChange} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="MM/DD/YYYY" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Age</label>
                  <input name="age" type="text" value={computedAge} readOnly className="w-full bg-gray-100 dark:bg-zinc-800/80 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none opacity-70 cursor-not-allowed" placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sex</label>
                  <select name="sex" required className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Civil Status</label>
                  <select name="civil_status" value={formCivilStatus} onChange={e => setFormCivilStatus(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-bold outline-none appearance-none cursor-pointer">
                    <option value="">Select...</option>
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Heart Rate (BPM)</label>
                  <input name="hr" required type="number" min="0" max="300" value={formHr} onChange={(e) => setFormHr(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Blood Pressure (SYS/DIA)</label>
                  <input name="bp" required type="text" value={formBp} onChange={(e) => setFormBp(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="--/--" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Oxygen Saturation (%) {gatheringStep === 'SPO2' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="spo2" required type="text" readOnly value={formSpo2 || (gatheringStep === 'SPO2' ? liveSpo2 : '')} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'SPO2' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex justify-between items-center">Body Temperature (°C) {gatheringStep === 'TEMP' && <Loader2 size={10} className="animate-spin text-[#022FFC]" />}</label>
                  <input name="temp" required type="text" readOnly value={formTemp || (gatheringStep === 'TEMP' ? liveTemp : '')} className={`w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm dark:text-white font-black tabular-nums outline-none ${gatheringStep === 'TEMP' ? 'text-blue-500 animate-pulse' : ''}`} placeholder="--" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting || !formHr || !formBp || !formSpo2 || !formTemp} className="w-full py-4 bg-[#022FFC] text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-2xl uppercase tracking-widest text-xs">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Confirm Vital Registration
              </button>
            </form>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10">
          <div className="bg-[#022FFC] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-blue-400">
            <CheckCircle2 size={24} />
            <div className="text-left">
              <p className="font-black text-sm uppercase tracking-widest">Entry Synchronized</p>
              <p className="text-xs opacity-80 font-medium">The patient vital signs have been successfully logged.</p>
            </div>
          </div>
        </div>
      )}
      {showConfirmCancelModal && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowConfirmCancelModal(false)} />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-8 md:p-10 w-full max-w-sm relative z-10 animate-in zoom-in-95 border border-rose-100 dark:border-rose-900/30 overflow-hidden text-center">
            <div className="mx-auto h-20 w-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center text-rose-500 mb-6">
               <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black dark:text-white tracking-tighter mb-2">Cancel Registration?</h3>
            <p className="text-xs text-gray-500 font-bold mb-8">Are you sure you want to cancel? Any unsaved data will be lost.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmCancelModal(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs"
              >
                No, Keep Editing
              </button>
              <button 
                onClick={confirmCancel}
                className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-600 transition-all active:scale-[0.98] uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
