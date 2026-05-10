import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Mail, Shield, Save, Key, Bell, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AccountProps {
  user: User;
  onUpdateUser?: (user: User) => void;
}

const Account: React.FC<AccountProps> = ({ user, onUpdateUser }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [fullName, setFullName] = useState(user.name || '');
  const [username, setUsername] = useState(user.username || '');
  const [email, setEmail] = useState(user.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async () => {
    setErrorMsg('');
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('New access keys do not match.');
      return;
    }
    
    if ((newPassword && !oldPassword) || (oldPassword && !newPassword)) {
      setErrorMsg('Both active security key and new access key are required to change credentials.');
      return;
    }

    setIsSaving(true);
    try {
      const dataToUpdate: any = {};
      if (fullName !== user.name) dataToUpdate.name = fullName;
      if (username !== user.username) dataToUpdate.username = username;
      if (email !== user.email) dataToUpdate.email = email;
      
      if (oldPassword && newPassword) {
        dataToUpdate.old_password = oldPassword;
        dataToUpdate.new_password = newPassword;
      }

      if (Object.keys(dataToUpdate).length > 0) {
        const updatedUser = await api.updateProfile(dataToUpdate);
        if (onUpdateUser) {
          onUpdateUser({ ...user, ...updatedUser, name: updatedUser.name || updatedUser.username });
        }
      }
      
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tighter uppercase">Professional Profile</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-1 font-medium">Manage your personal credentials and clinic access rights.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto px-8 py-3.5 bg-[#022FFC] text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Synchronize Account
        </button>
      </div>

      <div className="space-y-10">
        {showSuccess && (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-[2rem] flex items-center gap-4 font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-top-4 duration-300">
             <CheckCircle2 size={24} /> Clinical profile updated successfully.
          </div>
        )}

        {errorMsg && (
          <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400 rounded-[2rem] flex items-center gap-4 font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-top-4 duration-300">
             <AlertCircle size={24} /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-1">
             <h3 className="font-black text-[#022FFC] flex items-center gap-2 mb-2 uppercase tracking-[0.2em] text-[10px]">
               <UserIcon size={14} /> Global Identity
             </h3>
             <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">Your verified professional profile within the institution monitoring network.</p>
          </div>
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-8">
              <div className="flex items-center gap-8 mb-4">
                <div className="h-24 w-24 bg-blue-50 dark:bg-blue-900/30 rounded-[2rem] flex items-center justify-center text-[#022FFC] dark:text-teal-400 font-black text-4xl border border-blue-100 dark:border-blue-800 shadow-xl shadow-blue-500/5">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-black text-2xl dark:text-white tracking-tighter leading-tight">{user.name}</h4>
                  <p className="text-[10px] font-black text-[#022FFC] uppercase tracking-[0.2em] mt-2">Verified {user.role}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input 
                      type="text" 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Username</label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="text" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-1">
             <h3 className="font-black text-[#022FFC] flex items-center gap-2 mb-2 uppercase tracking-[0.2em] text-[10px]">
               <Shield size={14} /> Security Keys
             </h3>
             <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">Update your encrypted credentials to maintain system integrity.</p>
          </div>
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Active Security Key</label>
                <div className="relative">
                  <Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">New Access Key</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Confirm Access Key</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-2xl py-3.5 px-5 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
