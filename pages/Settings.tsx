
import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { Shield, Save, AlertTriangle, CheckCircle2, Thermometer, Activity, Heart, Droplet } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  user: User;
}

interface ThresholdValues {
  heartRateLow: number;
  heartRateHigh: number;
  spo2Low: number;
  spo2High: number;
  tempLow: number;
  tempHigh: number;
  bpSysLow: number;
  bpSysHigh: number;
  bpDiaLow: number;
  bpDiaHigh: number;
}

const DEFAULT_THRESHOLDS: ThresholdValues = {
  heartRateLow: 60,
  heartRateHigh: 100,
  spo2Low: 95,
  spo2High: 100,
  tempLow: 36.5,
  tempHigh: 37.5,
  bpSysLow: 90,
  bpSysHigh: 120,
  bpDiaLow: 60,
  bpDiaHigh: 80,
};

const STORAGE_KEY = 'catechcare_thresholds';

const loadThresholds = (): ThresholdValues => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_THRESHOLDS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load thresholds from storage:', e);
  }
  return { ...DEFAULT_THRESHOLDS };
};

const saveThresholds = (thresholds: ThresholdValues): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  } catch (e) {
    console.error('Failed to save thresholds to storage:', e);
  }
};

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [thresholds, setThresholds] = useState<ThresholdValues>(loadThresholds);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = useCallback((field: keyof ThresholdValues, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setThresholds(prev => ({ ...prev, [field]: numValue }));
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveThresholds(thresholds);
      setIsSaving(false);
      setShowSuccess(true);
      api.logSystemAction('Changed Thresholds', 'Updated local clinical threshold alarm limits').catch(console.error);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-black dark:text-white tracking-tighter">Clinical Configuration</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 font-medium">Manage institutional alarm thresholds for student and staff health monitoring.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3 bg-[#022FFC] hover:opacity-90 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
          Apply Updates
        </button>
      </div>

      <div className="space-y-10">
        {showSuccess && (
          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-[2rem] flex items-center gap-4 font-black text-xs uppercase tracking-widest animate-in slide-in-from-top-4 duration-300">
             <CheckCircle2 size={24} /> Clinic parameters synchronized successfully.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <h3 className="font-black text-rose-500 flex items-center gap-2 mb-2 uppercase tracking-[0.2em] text-[10px]">
               <Shield size={14} /> Local Alarm Notification
             </h3>
             <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">Define the ranges that trigger clinical alerts for this specific institutional monitoring station.</p>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Heart Rate */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={16} className="text-rose-500" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">Heart Rate (BPM)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Low (Brady)</p>
                      <input
                        type="number"
                        value={thresholds.heartRateLow}
                        onChange={(e) => handleChange('heartRateLow', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">High (Tachy)</p>
                      <input
                        type="number"
                        value={thresholds.heartRateHigh}
                        onChange={(e) => handleChange('heartRateHigh', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Body Temperature */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Thermometer size={16} className="text-amber-500" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">Body Temp (°C)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Low (Hypo)</p>
                      <input
                        type="number"
                        step="0.1"
                        value={thresholds.tempLow}
                        onChange={(e) => handleChange('tempLow', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">High (Fever)</p>
                      <input
                        type="number"
                        step="0.1"
                        value={thresholds.tempHigh}
                        onChange={(e) => handleChange('tempHigh', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* SpO2 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet size={16} className="text-cyan-500" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">SpO2 (%)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Lower Bound</p>
                      <input
                        type="number"
                        value={thresholds.spo2Low}
                        onChange={(e) => handleChange('spo2Low', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Upper Bound</p>
                      <input
                        type="number"
                        value={thresholds.spo2High}
                        onChange={(e) => handleChange('spo2High', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-blue-500" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">Blood Pressure</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Sys Low</p>
                      <input
                        type="number"
                        value={thresholds.bpSysLow}
                        onChange={(e) => handleChange('bpSysLow', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Sys High</p>
                      <input
                        type="number"
                        value={thresholds.bpSysHigh}
                        onChange={(e) => handleChange('bpSysHigh', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Dia Low</p>
                      <input
                        type="number"
                        value={thresholds.bpDiaLow}
                        onChange={(e) => handleChange('bpDiaLow', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest pl-1">Dia High</p>
                      <input
                        type="number"
                        value={thresholds.bpDiaHigh}
                        onChange={(e) => handleChange('bpDiaHigh', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-black dark:text-white focus:ring-2 focus:ring-teal-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-3xl flex items-start gap-4">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed font-bold">
                  Clinical parameters are set to institutional medical standards. Unauthorized modification is logged for audit purposes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
