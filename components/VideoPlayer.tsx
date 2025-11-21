
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
      <div className="mt-4 flex items-start justify-between px-2">
         <div className="space-y-1">
            <div className="flex items-center gap-2">
               <span className="text-sm font-medium text-white">{t.player_generated}</span>
               <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 border border-white/5 uppercase">
                  {video.settings.resolution}
               </span>
            </div>
            <p className="text-sm text-gray-400 max-w-2xl line-clamp-2 font-light">{video.prompt}</p>
         </div>
         
         <div className="flex gap-2">
             <a 
              href={video.url} 
              download={`veo3-${video.id}.mp4`}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </a>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Like">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
         </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
