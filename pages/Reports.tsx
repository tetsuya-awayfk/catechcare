
import React, { useState } from 'react';
import { FileText, Download, Calendar, ArrowRight, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { api } from '../services/api';

const Reports: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportReady, setReportReady] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('STUDENT');
  const [reportData, setReportData] = useState<any[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReportReady(false);
    setProgress(0);
    setReportData([]);
    
    // Simulate some progress for UX while fetching
    const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 85));
    }, 200);

    try {
        const response = await api.getClinicStats(startDate, endDate, category);
        setReportData(response);
    } catch (error) {
        console.error("Failed to fetch clinic stats for export:", error);
    } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
            setIsGenerating(false);
            setReportReady(true);
        }, 300);
    }
  };

  const generateCSV = () => {
      // 1) Define columns
      const cols = [
          "PATIENT ID", "NAME", "COURSE", "YEAR", "HR", "BP", "B.T.", "SpO2", "DATE EXAMINED", "STATUS", "EXAMINED BY"
      ];
      
      // 2) Map data to rows based on category requirement
      const rows = reportData.map(record => {
          const formattedDate = new Date(record.recorded_at).toLocaleDateString('en-US');
          const statusStr = record.is_alert ? "NEED CHECKING" : "NORMAL";
          const bpStr = `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}`;
          
          if (category === 'STUDENT') {
              return [
                  record.patient_id_string || '',
                  record.patient_name || '',
                  record.course || '',
                  record.year_level || '',
                  record.heart_rate,
                  bpStr,
                  record.body_temperature,
                  record.oxygen_saturation + '%',
                  formattedDate,
                  statusStr,
                  record.recorded_by_name || ''
              ];
          } else {
              return [
                record.patient_id_string || '',
                record.patient_name || '',
                '', // Course not needed
                '', // Year not needed
                record.heart_rate,
                bpStr,
                record.body_temperature,
                record.oxygen_saturation + '%',
                formattedDate,
                statusStr,
                record.recorded_by_name || ''
            ];
          }
      });
      
      // Filter out empty course/year columns if not student? 
      // The prompt structure shows course/year for students, and just drops those columns for staff.
      let finalCols = cols;
      let finalRows = rows;
      
      if (category !== 'STUDENT') {
          finalCols = cols.filter(c => c !== 'COURSE' && c !== 'YEAR');
          finalRows = rows.map(r => {
             // remove index 2 and 3 (course, year)
             const newR = [...r];
             newR.splice(2, 2);
             return newR;
          });
      }

      const csvContent = [
          finalCols.join(','),
          ...finalRows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Clinic_Stats_${category}_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black dark:text-white tracking-tighter uppercase">Health Metrics</h1>
        <p className="text-gray-500 dark:text-zinc-400 mt-1 font-medium">Aggregate and export vitals data for institutional reviews.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h3 className="font-black dark:text-white mb-8 text-xs uppercase tracking-[0.2em] text-gray-400">Parameter Configuration</h3>
          <div className="space-y-6">
             <div>
               <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1">Category & Date Interval</label>
               <div className="flex flex-col gap-3">
                 <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-3.5 border border-gray-100 dark:border-zinc-700 relative">
                   <select
                     value={category}
                     onChange={(e) => setCategory(e.target.value)}
                     className="w-full bg-transparent text-sm font-bold dark:text-zinc-300 outline-none appearance-none pr-8 cursor-pointer"
                   >
                     <option value="STUDENT">Student Records</option>
                     <option value="TEACHING_STAFF">Teaching Staff Records</option>
                     <option value="NON_TEACHING_STAFF">Non-Teaching Staff Records</option>
                   </select>
                   <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                 </div>
                 
                 <div className="flex items-center gap-3">
                   <div className="flex-1 bg-gray-50 dark:bg-zinc-800 rounded-2xl p-3.5 border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                     <input 
                       type="date" 
                       value={startDate} 
                       onChange={e => setStartDate(e.target.value)} 
                       className="w-full bg-transparent text-sm font-bold dark:text-zinc-300 outline-none" 
                     />
                   </div>
                   <ArrowRight className="text-gray-300 shrink-0" size={16} />
                   <div className="flex-1 bg-gray-50 dark:bg-zinc-800 rounded-2xl p-3.5 border border-gray-100 dark:border-zinc-700 flex items-center justify-between">
                     <input 
                       type="date" 
                       value={endDate} 
                       onChange={e => setEndDate(e.target.value)} 
                       className="w-full bg-transparent text-sm font-bold dark:text-zinc-300 outline-none" 
                     />
                   </div>
                 </div>
               </div>
             </div>
             <div>
               <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1">Clinical Data Points</label>
               <div className="grid grid-cols-2 gap-3">
                 {['Vital Sign History', 'Patient Data', 'Alarm Logs', 'Patient Status'].map(tag => (
                   <div key={tag} className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                     <div className="h-5 w-5 rounded-lg bg-[#022FFC] flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-white" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-300">{tag}</span>
                   </div>
                 ))}
               </div>
             </div>

             <button 
               onClick={handleGenerate}
               disabled={isGenerating}
               className="w-full mt-6 py-4 bg-[#022FFC] text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20"
             >
               {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
               {isGenerating ? 'Compiling Metrics...' : 'Generate Clinical Record'}
             </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm">
            {!isGenerating && !reportReady && (
              <div className="animate-in fade-in duration-500">
                <div className="h-24 w-24 bg-blue-50 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center text-blue-200 mx-auto mb-6 border-2 border-dashed border-blue-100 dark:border-zinc-700">
                  <FileText size={40} />
                </div>
                <h4 className="font-black dark:text-white uppercase text-xs tracking-widest">Awaiting Command</h4>
                <p className="text-xs text-gray-500 mt-2 max-w-[200px] font-medium leading-relaxed">Initialize generation to compile clinic statistics.</p>
              </div>
            )}

            {isGenerating && (
              <div className="w-full px-6 animate-in zoom-in-95 duration-300">
                <div className="relative h-48 w-48 mx-auto flex items-center justify-center mb-8">
                   <svg className="absolute inset-0 w-full h-full -rotate-90">
                     <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-zinc-800" />
                     <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#022FFC] transition-all duration-150" strokeDasharray={502} strokeDashoffset={502 - (502 * progress / 100)} strokeLinecap="round" />
                   </svg>
                   <div className="text-center">
                     <span className="text-4xl font-black dark:text-white tabular-nums tracking-tighter">{progress}%</span>
                     <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2">Processing</p>
                   </div>
                </div>
                <p className="text-sm font-bold dark:text-zinc-400 text-[#022FFC]">Synchronizing vital records...</p>
              </div>
            )}

            {reportReady && (
              <div className="animate-in slide-in-from-bottom-8 duration-500">
                <div className="h-24 w-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2rem] flex items-center justify-center text-emerald-600 mx-auto mb-6 border border-emerald-100 dark:border-emerald-800 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="font-black dark:text-white uppercase text-xs tracking-widest">Report Ready</h4>
                <p className="text-[10px] text-gray-400 mt-2 font-mono">Record #CLIN-2026-1019</p>
                
                <div className="flex flex-col gap-3 mt-10">
                   <button 
                     onClick={generateCSV}
                     className="px-6 py-3.5 bg-[#022FFC] text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-blue-500/10"
                   >
                     <Download size={14} /> Export Data Logs (CSV)
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
