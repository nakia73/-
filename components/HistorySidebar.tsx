
import React, { useState } from 'react';
import { GeneratedVideo, VideoTask } from '../types';

interface HistorySidebarProps {
  history: GeneratedVideo[];
  tasks: VideoTask[];
  onSelectHistory: (video: GeneratedVideo) => void;
  activeId?: string;
  t: any;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, tasks, onSelectHistory, activeId, t }) => {
  const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'processing');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // View State
  const [isSplitView, setIsSplitView] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('history');

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === history.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(history.map(v => v.id)));
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    const idsToDownload = Array.from(selectedIds);

    idsToDownload.forEach((id, index) => {
      const video = history.find(v => v.id === id);
      if (video && video.isLocal) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = video.url;
          a.download = `kie-studio-${video.id}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, index * 800);
      }
    });
  };

  // --- Render Components ---

  const renderQueueList = () => (
    <div className="flex flex-col h-full bg-[#0c0c0e] relative overflow-hidden">
      {/* List Header */}
      <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center h-12 bg-white/[0.02]">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
           <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
           {t.hist_queue}
        </h3>
        {activeTasks.length > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-black">
            {activeTasks.length}
          </span>
        )}
      </div>

      <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
        {activeTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-700 gap-3">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-6 h-6 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
             </div>
             <div className="text-xs font-medium">{t.hist_empty}</div>
          </div>
        )}
        {activeTasks.map(task => (
          <div key={task.id} className="bg-[#18181b] border border-white/5 rounded-lg p-3 relative overflow-hidden animate-fade-in group hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  task.status === 'processing' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-white/5 text-gray-500 border border-white/5'
                }`}>
                  {task.status}
                </span>
                {task.retryCount > 0 && <span className="text-[9px] text-orange-400 font-mono">RETRY {task.retryCount}</span>}
            </div>
            <p className="text-xs text-gray-300 line-clamp-2 mb-3 leading-relaxed font-light">{task.prompt || "Image Task"}</p>
            <div className="text-[10px] text-gray-500 flex items-center gap-2 border-t border-white/5 pt-2">
                {task.status === 'processing' ? (
                   <>
                     <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>
                     <span className="text-primary">{task.progress}</span>
                   </>
                ) : (
                   <span>{task.progress}</span>
                )}
            </div>
            {task.status === 'processing' && <div className="absolute bottom-0 left-0 h-[2px] bg-primary animate-progress w-full opacity-50"></div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistoryList = () => (
    <div className="flex flex-col h-full bg-[#0c0c0e] relative overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between h-12 bg-white/[0.02]">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
             <svg className="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {t.hist_history}
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Bulk Download Button - Moved to Header */}
            {selectedIds.size > 0 && (
               <button 
                 onClick={handleBulkDownload}
                 className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded text-[9px] font-bold transition-colors animate-fade-in"
                 title={t.hist_download_selected}
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 <span>{selectedIds.size}</span>
               </button>
            )}

            {history.length > 0 && (
              <button onClick={toggleSelectAll} className="text-[10px] font-medium text-gray-500 hover:text-white transition-colors">
                {selectedIds.size === history.length ? t.hist_deselect_all : t.hist_select_all}
              </button>
            )}
          </div>
      </div>
      
      <div className="overflow-y-auto p-2 space-y-1 flex-1 custom-scrollbar">
        {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-700 gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                   <svg className="w-6 h-6 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <div className="text-xs font-medium">{t.hist_no_videos}</div>
            </div>
        )}
        
        {history.map((video) => {
          const isSelected = selectedIds.has(video.id);
          const hasFile = video.isLocal;
          const isActive = activeId === video.id;
          
          return (
            <div
              key={video.id}
              className={`w-full group relative rounded-lg overflow-hidden border transition-all duration-200 flex animate-fade-in ${
                isActive 
                    ? 'border-primary/40 bg-white/5' 
                    : 'border-transparent hover:bg-[#18181b] hover:border-white/5'
              }`}
            >
              <div className="flex items-center pl-3">
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleSelection(video.id)}
                  disabled={!hasFile}
                  className="w-3.5 h-3.5 rounded border-white/20 bg-black checked:bg-primary checked:border-primary text-primary focus:ring-0 cursor-pointer disabled:opacity-20 transition-all appearance-none border checked:after:content-['✓'] checked:after:text-black checked:after:text-[10px] checked:after:flex checked:after:justify-center checked:after:items-center"
                />
              </div>

              <div onClick={() => hasFile && onSelectHistory(video)} className={`flex-1 flex gap-3 p-3 ${hasFile ? 'cursor-pointer' : 'cursor-default opacity-60'}`}>
                <div className="w-20 h-14 bg-black rounded-md flex-shrink-0 overflow-hidden border border-white/10 relative group-hover:border-white/20 transition-colors shadow-sm">
                    {hasFile ? (
                        <>
                          <video src={video.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                              <svg className="w-6 h-6 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                          </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <p className={`text-xs font-medium line-clamp-2 leading-relaxed ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>{video.prompt}</p>
                    {!hasFile ? (
                        <div className="text-[9px] text-red-400/80 flex items-center gap-1 font-mono mt-1">
                            <span className="w-1 h-1 rounded-full bg-red-500"></span>
                            {t.hist_missing_file}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-[9px] text-gray-600 group-hover:text-gray-500 font-mono mt-1">
                             <span>{new Date(video.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             <span className="text-white/10">|</span>
                             <span className="uppercase">{video.settings.resolution || '720p'}</span>
                        </div>
                    )}
                </div>
              </div>
              
              {!hasFile && video.originalKieUrl && (
                  <a 
                      href={video.originalKieUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-gray-400 hover:text-white z-10 transition-colors"
                      title={t.hist_try_link}
                  >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`flex-shrink-0 bg-[#0c0c0e] border-l border-white/5 flex flex-col h-full z-20 transition-all duration-300 ease-out shadow-2xl ${isSplitView ? 'w-[640px]' : 'w-80'}`}>
       {/* Layout Toolbar */}
       <div className="h-10 border-b border-white/5 flex items-center justify-between px-3 bg-[#0c0c0e] shrink-0">
          
          {/* View Mode Switcher */}
          <div className="flex bg-[#18181b] rounded-lg p-0.5 border border-white/5">
             <button 
                onClick={() => setActiveTab('queue')}
                disabled={isSplitView}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 ${
                    !isSplitView && activeTab === 'queue' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                } ${isSplitView ? 'opacity-40 cursor-not-allowed' : ''}`}
             >
                {t.hist_queue}
                {activeTasks.length > 0 && !isSplitView && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
             </button>
             <button 
                onClick={() => setActiveTab('history')}
                disabled={isSplitView}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-2 ${
                    !isSplitView && activeTab === 'history' ? 'bg-[#27272a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                } ${isSplitView ? 'opacity-40 cursor-not-allowed' : ''}`}
             >
                {t.hist_history}
             </button>
          </div>

          {/* Split/Single Toggle */}
          <button 
            onClick={() => setIsSplitView(!isSplitView)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                isSplitView 
                ? 'bg-white/10 text-white border-white/10' 
                : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'
            }`}
            title={isSplitView ? "Single Column" : "Split Columns"}
          >
             {isSplitView ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
             )}
          </button>
       </div>

       {/* Content Area */}
       <div className="flex-1 flex overflow-hidden bg-[#0c0c0e]">
          {isSplitView ? (
             <>
               <div className="w-1/2 h-full border-r border-white/5 flex flex-col min-w-0">
                 {renderQueueList()}
               </div>
               <div className="w-1/2 h-full flex flex-col min-w-0">
                 {renderHistoryList()}
               </div>
             </>
          ) : (
             <div className="w-full h-full flex flex-col min-w-0">
               {activeTab === 'queue' ? renderQueueList() : renderHistoryList()}
             </div>
          )}
       </div>
    </div>
  );
};

export default HistorySidebar;
