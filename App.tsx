
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Account from './pages/Account';
import Landing from './pages/Landing';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { AlarmProvider } from './AlarmContext';
import { HardwareProvider } from './HardwareContext';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const getInitialRoute = (role: UserRole) => {
    if (role === UserRole.NURSE) return "/patients";
    return "/dashboard";
  };

  return (
    <Router>
      <div className="min-h-screen transition-colors duration-300">
        {user ? (
          <HardwareProvider>
            <AlarmProvider>
              <div className="flex bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
              <Sidebar
                user={user}
                onLogout={handleLogout}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
              <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Navbar user={user} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
                <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
                  <Routes>
                    <Route path="/login" element={<Navigate to={getInitialRoute(user.role)} />} />
                    <Route path="/dashboard" element={user.role !== UserRole.NURSE ? <Dashboard /> : <Navigate to="/patients" />} />
                    <Route path="/patients" element={<Patients user={user} />} />
                    <Route path="/alerts" element={user.role !== UserRole.NURSE ? <Alerts /> : <Navigate to="/patients" />} />
                    <Route path="/reports" element={user.role !== UserRole.NURSE ? <Reports /> : <Navigate to="/patients" />} />
                    <Route path="/settings" element={user.role !== UserRole.NURSE ? <Settings user={user} /> : <Navigate to="/patients" />} />
                    <Route path="/account" element={<Account user={user} onUpdateUser={handleLogin} />} />
                    <Route path="/" element={<Navigate to={getInitialRoute(user.role)} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </main>
              </div>
            </div>
          </AlarmProvider>
          </HardwareProvider>
        ) : (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
};

export default App;

