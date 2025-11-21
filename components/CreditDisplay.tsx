
import React, { useState } from 'react';
import { ApiKeyData, Translation } from '../types';

interface CreditDisplayProps {
  apiKeys: ApiKeyData[];
  onRefresh: () => Promise<void>;
  t: Translation;
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ apiKeys, onRefresh, t }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error("Failed to refresh credits", e);
    } finally {
      setRefreshing(false);
    }
  };

  const processedAccounts = new Set<string>();
  let totalCredits = 0;

  apiKeys.forEach(k => {
    if (k.key && k.key.trim().length > 0 && k.remainingCredits !== undefined) {
      const identifier = k.accountLabel && k.accountLabel.trim().length > 0 
        ? k.accountLabel.trim() 
        : k.key.trim();
      
      if (!processedAccounts.has(identifier)) {
        processedAccounts.add(identifier);
        totalCredits += k.remainingCredits;
      }
    }
  });

  const totalValue = (totalCredits / 1000) * 5;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
      <div className="flex flex-col items-end">
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-0.5">
          {t.api_remaining}
        </span>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-sm font-bold text-white font-mono">{totalCredits.toLocaleString()}</span>
          <span className="text-[10px] text-green-400 font-mono">(${totalValue.toFixed(2)})</span>
        </div>
      </div>
      <button 
        onClick={handleRefresh}
        disabled={refreshing}
        className={`p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all ${refreshing ? 'animate-spin text-primary' : ''}`}
        title={t.api_refresh_balance}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default CreditDisplay;
