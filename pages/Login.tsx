
import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Activity, Lock, Mail } from 'lucide-react';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both credentials');
      return;
    }

    setIsLoading(true);
    try {
      const { access, user } = await api.login({ username, password, role });
      localStorage.setItem('token', access);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Wrong credentials, or selected role. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-20 w-20 bg-blue-50 dark:bg-blue-900/10 text-[#022FFC] dark:text-teal-400 rounded-3xl mb-4 border border-blue-100 dark:border-blue-900/20 shadow-xl shadow-blue-500/10 overflow-hidden p-2">
            <img src="/catechcare-logo.png" alt="CATechCare Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">CATechCare</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2 font-medium">Institutional Health Monitoring Portal</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl shadow-blue-100 dark:shadow-none p-10 border border-gray-100 dark:border-zinc-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1">Username / Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#022FFC] transition-colors" size={18} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-[#022FFC] focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl py-3.5 pl-12 pr-4 transition-all text-gray-800 dark:text-white font-bold"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1">Security Key</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#022FFC] transition-colors" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-[#022FFC] focus:ring-4 focus:ring-blue-500/10 outline-none rounded-2xl py-3.5 pl-12 pr-4 transition-all text-gray-800 dark:text-white font-bold"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2 pl-1">Assigned Role</label>
              <div className="grid grid-cols-3 gap-3">
                {[UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`
                      py-3 rounded-xl text-[10px] font-black transition-all border-2 uppercase tracking-widest
                      ${role === r 
                        ? 'bg-[#022FFC] border-[#022FFC] text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:border-[#022FFC]/30'}
                    `}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest animate-in fade-in zoom-in-95">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-[#022FFC] text-white font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center shadow-2xl shadow-blue-500/20 disabled:opacity-70 uppercase tracking-widest text-xs"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3 justify-center">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authorizing...</span>
                  </div>
                ) : (
                  "Request Access"
                )}
              </button>


            </div>
          </form>
        </div>
        <p className="text-center mt-10 text-[9px] text-gray-400 dark:text-zinc-500 uppercase tracking-[0.3em] font-black">
          Clinic Operating System • Secure Node
        </p>
      </div>
    </div>
  );
};

export default Login;
