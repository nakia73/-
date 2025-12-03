
import React, { useRef, useEffect } from 'react';
import { GeneratedVideo } from '../types';

interface VideoPlayerProps {
  video: GeneratedVideo;
  t: any;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video.url]);

  return (
    <div className="flex flex-col h-full">
      {/* Video Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group rounded-lg border border-white/5">
        <video
          ref={videoRef}
          className="w-full h-full max-h-[70vh] object-contain"
          controls
          autoPlay
          loop
          playsInline
        >
          <source src={video.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      
      {/* Metadata Bar */}
      <div className="mt-4 px-1 flex flex-col gap-3">
         {/* Header Row: Title/Specs & Actions */}
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <span className="text-sm font-bold text-white tracking-wide">{t.player_generated}</span>
               <div className="flex gap-2">
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 border border-white/5 uppercase">
                    {video.settings.resolution}
                 </span>
                 <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                    {video.settings.model}
                 </span>
               </div>
            </div>
            
            <div className="flex gap-2">
                <a 
                  href={video.url} 
                  download={`veo3-${video.id}.mp4`}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
            </div>
         </div>

         {/* Full Prompt Display Container */}
         <div className="bg-[#18181b] rounded-xl border border-white/5 p-4 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-gray-300 font-light whitespace-pre-wrap leading-relaxed selection:bg-primary/20">
              {video.prompt}
            </p>
         </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
