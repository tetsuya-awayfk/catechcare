
import React from 'react';
import { NavLink } from 'react-router-dom';
import { User } from '../types';
import { NAVIGATION_ITEMS } from '../constants';
import { LogOut, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isCollapsed, onToggle }) => {
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleConfirmLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      onLogout();
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }, 1200);
  };

  const filteredNavItems = NAVIGATION_ITEMS.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <>
      <aside 
        className={`bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 transition-all duration-300 flex flex-col z-20 h-screen ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-50 dark:border-zinc-800">
          {!isCollapsed && (
            <div className="flex items-center gap-2 font-black text-[#022FFC] dark:text-teal-400">
              <img src="/catechcare-logo.png" alt="CATechCare Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl tracking-tighter uppercase italic">CATechCare</span>
            </div>
          )}
          {isCollapsed && <img src="/catechcare-logo.png" alt="CATechCare Logo" className="mx-auto w-8 h-8 object-contain" />}
          <button 
            onClick={onToggle}
            className="p-1.5 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg text-[#022FFC] dark:text-gray-500 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide px-3 space-y-1">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/${item.id}`}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-[#022FFC] text-white dark:bg-teal-900/20 dark:text-teal-400 shadow-xl shadow-blue-500/20' 
                  : 'text-[#022FFC] dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-zinc-800'}
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50 dark:border-zinc-800">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all w-full text-[#022FFC] dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-zinc-800 group relative
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={20} className="group-hover:text-rose-600" />
            {!isCollapsed && <span className="font-bold text-xs uppercase tracking-widest group-hover:text-rose-600">Sign Out</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => !isLoggingOut && setShowLogoutModal(false)}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl p-8 w-full max-w-sm relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-zinc-800">
            <h3 className="text-2xl font-black mb-2 dark:text-white tracking-tighter">Sign Out?</h3>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 text-sm font-medium">Are you sure you want to log out of CATechCare? All active sessions will be terminated.</p>
            <div className="flex gap-3">
              <button
                disabled={isLoggingOut}
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3.5 rounded-2xl border border-gray-100 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center shadow-xl shadow-rose-200 dark:shadow-none active:scale-95"
              >
                {isLoggingOut ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
