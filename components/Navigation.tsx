
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { User } from '@supabase/supabase-js';

interface NavigationProps {
  onOpenKeyManager: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  user: User | null;
  t: any;
}

const Navigation: React.FC<NavigationProps> = ({ 
  onOpenKeyManager, onOpenAuth, onLogout, 
  language, setLanguage, user, t 
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-16 flex-shrink-0 bg-background border-r border-white/5 flex flex-col items-center py-6 gap-8 z-20 relative">
      {/* App Logo */}
      <div 
        className="w-10 h-10 bg-gradient-to-br from-primary to-primaryHover rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4 hover:scale-105 transition-transform select-none cursor-default" 
        title="Sonic-GEN"
      >
        <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div className="flex flex-col gap-6 w-full">
        <NavItem active icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        } label={t.nav_generate} />
        
        <NavItem icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        } label={t.nav_assets} />
        
        <NavItem icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        } label={t.nav_voice} />

        <NavItem 
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          } 
          label={t.nav_settings} 
          onClick={onOpenKeyManager}
        />
      </div>

      <div className="mt-auto mb-4 flex flex-col gap-4 items-center">
         {/* Account Button with Popup */}
         <div className="relative" ref={menuRef}>
             <button 
               onClick={() => user ? setShowAccountMenu(!showAccountMenu) : onOpenAuth()}
               className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border overflow-hidden ${
                 user ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-surfaceHighlight border-white/10 text-gray-400 hover:text-white'
               }`}
               title={user ? "Account" : "Login"}
             >
               {user ? (
                   <div className="w-full h-full flex items-center justify-center font-bold text-[10px]">
                       {user.email?.substring(0, 2).toUpperCase()}
                   </div>
               ) : (
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
               )}
             </button>

             {/* Account Popup Menu */}
             {showAccountMenu && user && (
                 <div className="absolute bottom-0 left-10 mb-2 ml-2 w-56 bg-surface border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-fade-in">
                     <div className="text-xs text-gray-400 mb-1">{t.auth_signed_in_as}</div>
                     <div className="text-sm font-bold text-white truncate mb-3 pb-3 border-b border-white/5">{user.email}</div>
                     
                     <button 
                        onClick={() => { onLogout(); setShowAccountMenu(false); }}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm"
                     >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                         {t.auth_sign_out}
                     </button>
                 </div>
             )}
         </div>

         {/* Language Toggle */}
         <button 
          onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-300 border border-white/5 transition-colors"
         >
           {language === 'en' ? 'EN' : 'JP'}
         </button>
      </div>
    </div>
  );
};

const NavItem: React.FC<{icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full h-12 flex items-center justify-center relative group ${active ? 'text-primary' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
  >
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icon}
    </svg>
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
    <div className="absolute left-14 bg-surface border border-white/10 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
      {label}
    </div>
  </button>
);

export default Navigation;
