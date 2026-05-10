
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Bell, Sun, Moon, Search, User as UserIcon, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAlarms } from '../AlarmContext';
import { useNavigate } from 'react-router-dom';
import { useHardware } from '../HardwareContext';

interface NavbarProps {
  user: User;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, isDarkMode, onToggleTheme }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { isConnected, connect, disconnect } = useHardware();

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { notifications } = useAlarms();


  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 1) {
        setIsSearching(true);
        try {
          const results = await api.searchPatients(searchQuery);
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const navigate = useNavigate();

  const handleSelectPatient = (patient: any) => {
    setShowResults(false);
    setSearchQuery('');
    navigate('/patients', { state: { openPatientId: patient.institutional_id || patient.id } });
  };

  const handleAlertClick = () => {
    setShowNotifications(false);
    if (user.role === 'NURSE') {
      triggerToast('Access restricted to Doctors and Admins.');
    } else {
      navigate('/alerts');
    }
  };

  return (
    <header className={`h-16 bg-white dark:bg-zinc-900 border-b border-gray-50 dark:border-zinc-800 px-6 flex items-center justify-between z-30 transition-colors duration-300`}>
      <div className="flex-1 max-w-xl relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#022FFC] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search students or staff records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 1 && setShowResults(true)}
            className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-2.5 pl-11 pr-4 text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-zinc-800 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500"
          />
          {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />}
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <div className="p-2">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p)}
                  className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-bold dark:text-white group-hover:text-[#022FFC] transition-colors">{p.name_formatted || `${p.last_name}, ${p.first_name}`}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{p.institutional_id} • {p.category.replace(/_/g, ' ')}</p>
                  </div>
                  <Search size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={async () => {
            try {
              if (isConnected) {
                await disconnect();
              } else {
                await connect();
              }
            } catch (err) {
              console.error('Serial connection error:', err);
            }
          }}
          className={`group flex px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md items-center gap-2 cursor-pointer select-none active:scale-95 ${isConnected ? 'bg-emerald-500 hover:bg-rose-500 text-white shadow-emerald-500/20 hover:shadow-rose-500/20' : 'bg-[#022FFC] text-white hover:opacity-90 shadow-blue-500/20'}`}
        >
          <span className={isConnected ? "group-hover:hidden" : ""}>{isConnected ? 'Connected' : 'Connect Station'}</span>
          {isConnected && <span className="hidden group-hover:block">Disconnect</span>}
        </button>

        <button 
          onClick={onToggleTheme}
          className="p-2.5 text-[#022FFC] dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-xl transition-all active:scale-90"
        >
          {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 text-[#022FFC] dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-xl transition-all relative ${showNotifications ? 'bg-blue-50 dark:bg-zinc-800' : ''}`}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/30">
                <span className="font-black dark:text-white uppercase text-[10px] tracking-[0.2em] text-gray-400">Biological Alerts ({notifications.length})</span>
                <button onClick={() => setShowNotifications(false)} className="text-gray-300 hover:text-gray-500"><X size={18} /></button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-xs font-black uppercase tracking-widest">No Active Alerts</div>
                ) : notifications.map((n) => (
                  <div key={n.id} onClick={handleAlertClick} className="p-4 hover:bg-blue-50 dark:hover:bg-zinc-800/50 rounded-2xl transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-black dark:text-white group-hover:text-rose-500 transition-colors tracking-tight text-rose-500">Critical Threat</p>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(n.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">Abnormal vitals detected for <strong className="text-zinc-800 dark:text-zinc-300">{n.patient_name}</strong>.</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/50 text-center">
                <button onClick={handleAlertClick} className="text-[10px] font-black uppercase tracking-widest text-[#022FFC] dark:text-teal-400 hover:underline">View Alert Dashboard</button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-100 dark:bg-zinc-800 mx-1" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-zinc-900 dark:text-white leading-tight tracking-tight">{user.name}</p>
            <p className="text-[10px] text-[#022FFC] dark:text-teal-400 font-black uppercase tracking-widest">{user.role}</p>
          </div>
          <div className="h-10 w-10 bg-[#022FFC] dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-white dark:text-teal-400 border border-blue-400 dark:border-zinc-700 shadow-lg shadow-blue-500/20">
            <UserIcon size={18} />
          </div>
        </div>
      </div>
      
      {/* Toast Notification for Navbar */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[60] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-rose-500 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4">
            <div className="text-left">
              <p className="font-black text-xs uppercase tracking-widest">Protocol Error</p>
              <p className="text-[10px] opacity-90 font-medium">{toastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
