import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Clock, ArrowRight, UserCircle2, ChevronDown, Stethoscope, HeartPulse, FileText, X, MapPin, BookOpen, Coffee, Lightbulb, Axis3D, Laptop, Laptop2, LaptopMinimalCheckIcon, ComputerIcon, Computer, LucideLaptop, LucideLaptop2, LucideLaptopMinimalCheck, LucideLaptopMinimal } from 'lucide-react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
}

const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, delay = 0, direction = 'up' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      });
    }, { threshold: 0.1 });
    
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);
  
  let translateClass = 'translate-y-16';
  if (direction === 'left') translateClass = '-translate-x-16';
  if (direction === 'right') translateClass = 'translate-x-16';
  
  return (
    <div 
      ref={domRef} 
      className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${translateClass}`}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedDev, setSelectedDev] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/login');
    }, 400);
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const developers = [
    { 
      name: "Edencio M. Castillo II", 
      role: "Full-Stack Developer", 
      image: "/dev1.png",
      address: "Ambolong, Aroroy, Masbate",
      course: "BS in Computer Engineering",
      hobbies: "Programming, Valorant, Mobile Games",
      interests: "Embedded Systems, Web Development, IoT"},
    { 
      name: "Marcial A. Andes", 
      role: "QA Tester & Documenter", 
      image: "/dev2.png",
      address: "Biga, Magallenes, Sorsogon",
      course: "BS in Computer Engineering",
      hobbies: "Gym, Travel, Eating",
      interests: "Quality Assurance, Documentation"
    },
    { 
      name: "Marl Joshua Oliver", 
      role: "Hardware Integration", 
      image: "/dev3.png",
      address: "Camalig, Daraga, Albay",
      course: "BS in Computer Engineering",
      hobbies: "Mobile Games, Music",
      interests: "Human-Computer Interaction, Web Design"
    },
    { 
      name: "Arjie B. Mirabite", 
      role: "Hardware Integration", 
      image: "/dev4.png",
      address: "Legazpi City, Albay",
      course: "BS in Computer Engineering",
      hobbies: "Algorithmic Puzzles, Cycling, Movies",
      interests: "Hardware Integration, Embedded Systems"
    }
  ];

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-gray-100 selection:bg-[#022FFC] selection:text-white transition-all duration-500 ease-in-out ${isExiting ? 'opacity-0 scale-[0.98] blur-[2px]' : ''}`}>
      
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50 py-3 shadow-sm' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
                <img src="/catechcare-logo.png" alt="CATechCare Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[#022FFC] dark:text-teal-400 uppercase italic">CATechCare</span>
            </div>
            <div>
              <button 
                onClick={handleNavigate}
                className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-[#022FFC] dark:hover:border-teal-400 hover:text-[#022FFC] dark:hover:text-teal-400 font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2 group"
              >
                Clinic Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#022FFC] to-teal-400 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen" />
        </div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-teal-400/20 blur-[80px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/40 dark:border-zinc-700/50 mb-12 shadow-2xl shadow-blue-500/10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#022FFC] dark:bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#022FFC] dark:bg-teal-400"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-[#022FFC] dark:text-teal-400">Secure Medical Node Online</span>
          </div>
          
          <h1 className="text-6xl md:text-[7rem] lg:text-[8rem] font-black tracking-tighter mb-10 leading-[0.95] animate-in fade-in zoom-in-95 duration-1000 delay-100 drop-shadow-sm">
            Intelligent <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#022FFC] via-blue-500 to-teal-400">
              Health Monitoring
            </span>
          </h1>
          
          <div className="max-w-3xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 font-semibold leading-relaxed mb-6 tracking-tight">
              An intelligent health monitoring and data management system that enables real-time tracking of patient vital signs — integrating sensors, microcontrollers, and a secure database into one seamless interface.
            </p>
            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto">
              Designed for Computer Arts and Technological College, Inc., empowering medical personnel with efficient health record management and long-term patient monitoring.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 w-full px-4 sm:px-0">
            <button 
              onClick={handleNavigate}
              className="w-full sm:w-auto px-12 py-5 bg-[#022FFC] text-white font-black rounded-3xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(2,47,252,0.4)] hover:shadow-[0_0_60px_rgba(2,47,252,0.6)] text-sm uppercase tracking-[0.2em] group"
            >
              Access Secure Portal <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-32 bg-white dark:bg-zinc-900/30 border-y border-gray-100 dark:border-zinc-800/50 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">Built for Medical Excellence</h2>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium max-w-3xl mx-auto">
                Everything you need to monitor, record, and assess patient vitals seamlessly within a single ecosystem.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollReveal delay={100}>
              <div className="h-full p-10 rounded-[2.5rem] bg-gray-50 dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-[#022FFC] dark:text-teal-400 mb-8 shadow-xl shadow-blue-500/5 group-hover:scale-110 transition-transform duration-300">
                  <HeartPulse size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4">Real-time Vitals</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed text-lg">Direct hardware integration allowing instantaneous recording of blood pressure, heart rate, temperature, and SpO2.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="h-full p-10 rounded-[2.5rem] bg-gray-50 dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-[#022FFC] dark:text-teal-400 mb-8 shadow-xl shadow-blue-500/5 group-hover:scale-110 transition-transform duration-300">
                  <Shield size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4">Secure Records</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed text-lg">Enterprise-grade encryption and secure access protocols ensuring strict confidentiality of all medical records.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="h-full p-10 rounded-[2.5rem] bg-gray-50 dark:bg-zinc-900/80 border border-gray-100 dark:border-zinc-800 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-[#022FFC] dark:text-teal-400 mb-8 shadow-xl shadow-blue-500/5 group-hover:scale-110 transition-transform duration-300">
                  <FileText size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-4">Instant Reports</h3>
                <p className="text-gray-600 dark:text-gray-400 font-medium leading-relaxed text-lg">Automated medical certificate generation, simple health analytics, and comprehensive institutional logs.</p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Developers Section */}
      <div className="py-32 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#022FFC]/5 dark:bg-teal-900/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <ScrollReveal>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-xl shadow-blue-500/10 text-[#022FFC] dark:text-teal-400 mb-8">
              <LaptopMinimalCheckIcon size={32} />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Meet the Developers</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 font-medium mb-24 max-w-2xl mx-auto leading-relaxed">
              The engineering team behind CATechCare, dedicated to modernizing academic medical infrastructure.
            </p>
          </ScrollReveal>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {developers.map((dev, i) => (
              <ScrollReveal key={i} delay={i * 150}>
                <div 
                  onClick={() => setSelectedDev(dev)}
                  className="bg-white dark:bg-zinc-900 p-6 xl:p-8 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/50 dark:shadow-none hover:-translate-y-4 hover:shadow-2xl hover:shadow-blue-500/20 dark:hover:shadow-teal-900/30 transition-all duration-500 group relative cursor-pointer h-full flex flex-col justify-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-[#022FFC]/5 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="relative">
                    <div className="w-24 h-24 xl:w-28 xl:h-28 mx-auto rounded-[1.5rem] bg-gray-100 dark:bg-zinc-800 mb-6 overflow-hidden border-4 border-white dark:border-zinc-900 shadow-lg relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
                      <img 
                        src={dev.image} 
                        alt={dev.name} 
                        className="w-full h-full object-cover relative z-20"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                      <div className="fallback-icon hidden absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-400 z-10">
                        <UserCircle2 size={48} />
                      </div>
                    </div>
                    <h3 className="text-lg xl:text-xl font-black tracking-tight mb-2">{dev.name}</h3>
                    <div className="h-1 w-10 bg-[#022FFC] dark:bg-teal-400 mx-auto rounded-full mb-4 group-hover:w-20 transition-all duration-500" />
                    <p className="text-[10px] xl:text-xs font-black uppercase tracking-[0.1em] text-gray-500 dark:text-zinc-400 line-clamp-2">{dev.role}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* Developer Modal */}
      {selectedDev && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedDev(null)}
          />
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 animate-in zoom-in-75 fade-in slide-in-from-bottom-12 duration-500 ease-out border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col text-left">
            <div className="h-32 bg-gradient-to-r from-[#022FFC] to-teal-400 relative">
              <button 
                onClick={() => setSelectedDev(null)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="px-8 pb-8 relative">
              <div className="absolute -top-16 left-8">
                <div className="w-32 h-32 rounded-[1.5rem] border-4 border-white dark:border-zinc-900 bg-gray-100 dark:bg-zinc-800 shadow-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src={selectedDev.image} 
                    alt={selectedDev.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="fallback-icon hidden text-gray-400">
                    <UserCircle2 size={64} />
                  </div>
                </div>
              </div>
              
              <div className="pt-20">
                <h3 className="text-3xl font-black tracking-tight">{selectedDev.name}</h3>
                <p className="text-sm font-black uppercase tracking-[0.15em] text-[#022FFC] dark:text-teal-400 mb-6">{selectedDev.role}</p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors">
                    <BookOpen className="text-gray-400 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Course</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedDev.course}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors">
                    <MapPin className="text-gray-400 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Address</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedDev.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors">
                    <Coffee className="text-gray-400 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Hobbies</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedDev.hobbies}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors">
                    <Lightbulb className="text-gray-400 mt-1 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Interests</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedDev.interests}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200/50 dark:border-zinc-800/50 py-12 bg-white dark:bg-zinc-950 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[#022FFC] dark:text-teal-400 font-black">
            <div className="bg-blue-50 dark:bg-zinc-900 p-2 rounded-xl">
              <img src="/catechcare-logo.png" alt="CATechCare Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl tracking-tighter uppercase italic">CATechCare</span>
          </div>
          <div className="text-sm font-medium text-gray-500 dark:text-zinc-500 flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <span>© {new Date().getFullYear()} CATechCare Systems.</span>
            <span className="hidden sm:inline">•</span>
            <span>All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
