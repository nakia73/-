
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

  // Import JSZip (assuming it's installed or available)
  // Since we can't npm install here, we rely on individual downloads if JSZip fails or standard loop
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    const idsToDownload = Array.from(selectedIds);

    // Note: Real JSZip impl would go here. 
    // For now, sequential download for stability
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

  return (
    <div className="w-64 flex-shrink-0 bg-background border-l border-white/5 flex flex-col h-full z-20">
      <div className="flex-shrink-0 max-h-[40%] overflow-y-auto border-b border-white/5 flex flex-col">
         <div className="px-4 py-3 bg-surfaceHighlight/30 sticky top-0 backdrop-blur-sm z-10 border-b border-white/5">
           <h3 className="text-xs font-bold text-white uppercase tracking-wider flex justify-between items-center">
             {t.hist_queue}
             <span className="bg-primary text-black px-1.5 rounded text-[10px]">{activeTasks.length}</span>
           </h3>
         </div>
         <div className="p-2 space-y-2">
           {activeTasks.length === 0 && (
             <div className="text-center py-4 text-xs text-gray-600">{t.hist_empty}</div>
           )}
           {activeTasks.map(task => (
             <div key={task.id} className="bg-surface border border-white/10 rounded-lg p-3 relative overflow-hidden">
                <div className="flex justify-between items-start mb-1">
                   <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                     task.status === 'processing' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-gray-400'
                   }`}>
                     {task.status}
                   </span>
                   {task.retryCount > 0 && <span className="text-[10px] text-orange-400">{t.hist_retry} {task.retryCount}</span>}
                </div>
                <p className="text-xs text-gray-300 line-clamp-2 mb-2">{task.prompt || "Image Task"}</p>
                <div className="text-[10px] text-gray-500">{task.progress}</div>
                {task.status === 'processing' && <div className="absolute bottom-0 left-0 h-0.5 bg-primary animate-progress w-full"></div>}
             </div>
           ))}
         </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-surfaceHighlight/30 sticky top-0 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.hist_history}</h3>
           {history.length > 0 && (
             <button onClick={toggleSelectAll} className="text-[10px] text-primary hover:underline">
                {selectedIds.size === history.length ? t.hist_deselect_all : t.hist_select_all}
             </button>
           )}
        </div>
        
        <div className="overflow-y-auto p-2 space-y-2 flex-1">
          {history.length === 0 && <div className="text-center py-8 text-xs text-gray-600">{t.hist_no_videos}</div>}
          
          {history.map((video) => {
            const isSelected = selectedIds.has(video.id);
            const hasFile = video.isLocal;
            
            return (
              <div
                key={video.id}
                className={`w-full group relative rounded-lg overflow-hidden border transition-all flex ${
                  activeId === video.id ? 'border-primary bg-white/5' : 'border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex items-center pl-2">
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleSelection(video.id)}
                    disabled={!hasFile}
                    className="w-4 h-4 rounded border-white/20 bg-black/50 checked:bg-primary text-primary focus:ring-0 cursor-pointer disabled:opacity-30"
                  />
                </div>

                <div onClick={() => hasFile && onSelectHistory(video)} className={`flex-1 flex gap-3 p-2 ${hasFile ? 'cursor-pointer' : 'cursor-default opacity-60'}`}>
                  <div className="w-16 h-16 bg-black rounded flex-shrink-0 overflow-hidden border border-white/10 relative">
                      {hasFile ? (
                          <>
                            <video src={video.url} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute bottom-1 right-1">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                            </div>
                          </>
                      ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surfaceHighlight">
                             <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                      <p className="text-xs text-gray-300 font-medium line-clamp-2 mb-1">{video.prompt}</p>
                      {!hasFile ? (
                          <div className="text-[10px] text-orange-400 flex items-center gap-1">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             {t.hist_missing_file}
                          </div>
                      ) : (
                          <p className="text-[10px] text-gray-500">{new Date(video.timestamp).toLocaleTimeString()}</p>
                      )}
                  </div>
                </div>
                
                {!hasFile && video.originalKieUrl && (
                    <a 
                        href={video.originalKieUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-gray-300"
                        title={t.hist_try_link}
                    >
                        {t.hist_link}
                    </a>
                )}
              </div>
            );
          })}
        </div>

        {selectedIds.size > 0 && (
          <div className="p-4 border-t border-white/5 bg-surfaceHighlight/10 backdrop-blur-sm absolute bottom-0 left-0 right-0">
             <button 
               onClick={handleBulkDownload}
               className="w-full py-2 bg-secondary hover:bg-cyan-400 text-black text-xs font-bold rounded shadow-lg transition-all flex items-center justify-center gap-2"
             >
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               {t.hist_download_selected} ({selectedIds.size})
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
