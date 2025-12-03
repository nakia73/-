
import { useState, useEffect } from 'react';
import { ApiKeyData, VideoTask, VideoSettings, GeneratedVideo, Translation } from '../types';
import { generateVeoVideo, fetchCredits, getEstimatedCost } from '../services/veoService';
import { useToast } from '../components/ToastContext';
import { saveHistoryItem, fetchUserHistory } from '../services/historyService';

export const useVideoQueue = (t?: Translation) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>(() => 
    Array.from({ length: 10 }).map((_, i) => ({
      id: `key-${i}`,
      key: '',
      accountLabel: '', 
      activeRequests: 0,
      status: 'idle',
      totalGenerated: 0,
      remainingCredits: 0
    }))
  );

  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [history, setHistory] = useState<GeneratedVideo[]>([]);
  const [enableLocalHistory, setEnableLocalHistory] = useState(false); // synced from App
  const { addToast } = useToast();

  const updateKey = (id: string, updates: Partial<ApiKeyData>) => {
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k));
  };

  const updateTask = (id: string, updates: Partial<VideoTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateKeyConfig = (index: number, key: string, label: string) => {
    setApiKeys(prev => {
      const newKeys = [...prev];
      newKeys[index] = { 
          ...newKeys[index], 
          key, 
          accountLabel: label,
          status: 'idle', 
          activeRequests: 0, 
          errorMessage: undefined 
      };
      return newKeys;
    });
  };

  const importKeys = (newKeys: ApiKeyData[]) => {
    setApiKeys(currentKeys => {
        if (newKeys.length !== currentKeys.length) return newKeys;
        return currentKeys.map((current, idx) => {
            const incoming = newKeys[idx];
            return {
                ...current,
                key: incoming.key,
                accountLabel: incoming.accountLabel || '',
                totalGenerated: Math.max(current.totalGenerated, incoming.totalGenerated),
                remainingCredits: incoming.remainingCredits ?? current.remainingCredits
            };
        });
    });
  };

  const refreshAllCredits = async () => {
    const keysToRefresh = apiKeys.filter(k => k.key && k.key.length > 10);
    if (keysToRefresh.length === 0) return;

    const updates = await Promise.all(keysToRefresh.map(async (k) => {
        try {
            const credits = await fetchCredits(k.key);
            return { id: k.id, credits };
        } catch (e) {
            console.warn(`Failed to fetch credits for ${k.id}`, e);
            return { id: k.id, credits: k.remainingCredits ?? 0 };
        }
    }));

    setApiKeys(prev => prev.map(k => {
        const update = updates.find(u => u.id === k.id);
        if (update) {
            return { ...k, remainingCredits: update.credits };
        }
        return k;
    }));
  };

  const loadHistory = async (userId: string) => {
      try {
          const mergedHistory = await fetchUserHistory(userId, enableLocalHistory);
          if (mergedHistory && mergedHistory.length > 0) {
              setHistory(mergedHistory);
          }
      } catch (e) {
          console.error("Failed to load history", e);
      }
  };

  // Re-load history if local setting toggles (to hydrate blobs)
  useEffect(() => {
     // We can't easily re-fetch user ID here without prop, but usually this is stable.
     // This effect is just to ensure state update
  }, [enableLocalHistory]);

  const addToQueue = (prompt: string, startImageUrl: string | null, endImageUrl: string | null, settings: VideoSettings) => {
    const newTask: VideoTask = {
      id: crypto.randomUUID(),
      prompt,
      startImage: startImageUrl,
      endImage: endImageUrl,
      settings,
      status: 'pending',
      progress: 'Queued',
      createdAt: Date.now(),
      retryCount: 0
    };
    setTasks(prev => [...prev, newTask]);
    addToast("Task added to generation queue", "info");
  };

  useEffect(() => {
    const processQueue = async () => {
      try {
        const pendingTasks = tasks.filter(t => t.status === 'pending');
        if (pendingTasks.length === 0) return;

        // Create shallow copies to track local accounting in this tick
        // This is important because the 'apiKeys' state won't update until next render,
        // but we might process multiple tasks in one tick (loop).
        const schedulableKeys = apiKeys
            .filter(k => k.key.length > 0 && k.status !== 'error' && k.activeRequests < 2)
            .map(k => ({ ...k })); 

        if (schedulableKeys.length === 0) return;
        
        // Sort keys by load (activeRequests)
        schedulableKeys.sort((a, b) => a.activeRequests - b.activeRequests);

        let taskIndex = 0;
        
        // Iterate keys and try to fill slots
        for (const keyData of schedulableKeys) {
           const slots = 2 - keyData.activeRequests;
           for (let i=0; i<slots; i++) {
               if (taskIndex >= pendingTasks.length) break;
               
               const task = pendingTasks[taskIndex];
               const estimatedCost = getEstimatedCost(task.settings.model, task.settings.duration);
               const currentBalance = keyData.remainingCredits || 0;
               
               // Pre-flight Check: Does this key locally have enough credits?
               if (currentBalance < estimatedCost) {
                   // Key cannot afford this task. Stop assigning to this key.
                   break; 
               }
               
               // Start processing with the original Key ID (state update happens in startProcessing)
               startProcessing(task, keyData);
               
               // Deduct from local copy for the loop to prevent double booking in the same tick
               keyData.remainingCredits = currentBalance - estimatedCost;
               keyData.activeRequests++;
               
               taskIndex++;
           }
        }
      } catch (loopError) {
        console.error("Queue Loop Error:", loopError);
      }
    };

    const interval = setInterval(processQueue, 1000);
    return () => clearInterval(interval);
  }, [tasks, apiKeys]);

  const startProcessing = async (task: VideoTask, keyData: ApiKeyData) => {
    updateTask(task.id, { status: 'processing', assignedKey: keyData.id, progress: 'Starting...' });
    
    const estimatedCost = getEstimatedCost(task.settings.model, task.settings.duration);

    // Optimistic Deduction State Update
    setApiKeys(prev => prev.map(k => {
      if (k.id === keyData.id) {
        const currentCredits = k.remainingCredits || 0;
        return { 
          ...k, 
          activeRequests: k.activeRequests + 1, 
          status: 'busy', 
          errorMessage: undefined,
          // Deduct immediately to prevent UI lag or race conditions in next tick
          remainingCredits: Math.max(0, currentCredits - estimatedCost)
        };
      }
      return k;
    }));

    try {
      const { blob, remoteUrl } = await generateVeoVideo(
        keyData.key,
        task.prompt,
        task.startImage,
        task.endImage,
        task.settings,
        (status) => updateTask(task.id, { progress: status })
      );

      const url = URL.createObjectURL(blob);
      const result: GeneratedVideo = {
        id: task.id,
        url,
        remoteUrl, // Original Kie URL
        originalKieUrl: remoteUrl, // Backup ref
        prompt: task.prompt || "Image to Video",
        timestamp: Date.now(),
        settings: task.settings,
        blob,
        isLocal: true
      };

      updateTask(task.id, { status: 'completed', resultVideo: result, progress: 'Done' });
      setHistory(prev => [result, ...prev]);
      
      // Save History (Hybrid)
      saveHistoryItem(result, enableLocalHistory).catch(err => console.error("History save failed", err));

      setApiKeys(prev => prev.map(k => {
        if (k.id === keyData.id) {
          return {
            ...k,
            activeRequests: Math.max(0, k.activeRequests - 1),
            totalGenerated: k.totalGenerated + 1,
            status: k.activeRequests - 1 > 0 ? 'busy' : 'idle'
          };
        }
        return k;
      }));
      
      // Sync actual balance from server after completion
      fetchCredits(keyData.key).then(credits => {
          updateKey(keyData.id, { remainingCredits: credits });
      });

      addToast(`Generation Complete! (Node ${keyData.id})`, 'success');

    } catch (error: any) {
      console.error(`Task ${task.id} failed on Key ${keyData.id}`, error);
      const errMsg = error.message || '';
      
      const isQuotaError = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Rate Limited');
      const isCreditError = errMsg.includes('402') || errMsg.includes('credits') || errMsg.includes('insufficient') || errMsg.includes('Insufficient');
      
      const shouldDisableKey = isQuotaError || isCreditError;
      let disableMsg = 'Error';
      if (isCreditError) disableMsg = 'Insufficient Credits';
      else if (isQuotaError) disableMsg = 'Rate Limit';

      if (shouldDisableKey) {
        const msg = isCreditError 
           ? (t?.api_remaining || 'Insufficient Credits') 
           : 'Rate Limit Exceeded';
        addToast(`${msg} detected on ${keyData.id}. Disabling node.`, isCreditError ? 'warning' : 'error');
      } else {
        addToast(`Generation Error: ${errMsg.substring(0, 50)}...`, 'warning');
      }

      setApiKeys(prev => prev.map(k => {
        if (k.id === keyData.id) {
          // Note: If failed, we could technically refund the estimated cost locally,
          // but it's safer to just set status and wait for manual refresh or next auto-sync.
          return {
            ...k,
            activeRequests: Math.max(0, k.activeRequests - 1),
            status: shouldDisableKey ? 'error' : 'idle', 
            errorMessage: shouldDisableKey ? disableMsg : 'Error'
          };
        }
        return k;
      }));

      const hasOtherViableKeys = apiKeys.some(k => k.id !== keyData.id && k.key.length > 0 && k.status !== 'error');

      if (shouldDisableKey && !hasOtherViableKeys) {
        updateTask(task.id, { status: 'failed', error: disableMsg, progress: `Failed: ${disableMsg}` });
        addToast(`Task failed. All keys exhausted.`, 'error');
      } else if (task.retryCount < 3) {
        updateTask(task.id, { status: 'pending', retryCount: task.retryCount + 1, progress: 'Retrying...', assignedKey: undefined });
        addToast(`Retrying task on new node (Attempt ${task.retryCount + 1})...`, 'info');
      } else {
        updateTask(task.id, { status: 'failed', error: errMsg, progress: 'Failed' });
        addToast(`Task permanently failed after 3 retries.`, 'error');
      }
    }
  };

  return {
    apiKeys,
    addKey: updateKeyConfig,
    importKeys,
    refreshAllCredits,
    loadHistory,
    tasks,
    addToQueue,
    history,
    setEnableLocalHistory // Expose setter for App sync
  };
};
