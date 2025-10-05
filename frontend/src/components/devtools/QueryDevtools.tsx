/**
 * Query Devtools Component
 *
 * Development-only component for debugging query cache and network activity
 * Only renders in development mode
 */

import React, { useState, useEffect } from 'react';
import { queryClient } from '../../hooks';
import { X, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';

export function QueryDevtools() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({ size: 0, activeQueries: 0 });
  const [cacheData, setCacheData] = useState<Map<string, any>>(new Map());

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  useEffect(() => {
    const updateStats = () => {
      const newStats = queryClient.getStats();
      setStats(newStats);

      if (isOpen) {
        const data = queryClient.inspect();
        setCacheData(data);
      }
    };

    // Update stats every second
    const interval = setInterval(updateStats, 1000);
    updateStats();

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached queries?')) {
      queryClient.clear();
      console.log('🧹 Cache cleared manually via devtools');
    }
  };

  const handleInvalidateAll = () => {
    queryClient.invalidateQueries({ predicate: () => true });
    console.log('🔄 All queries invalidated manually via devtools');
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Toggle Query Devtools"
      >
        {isOpen ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      {/* Devtools panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-[9998] w-96 max-h-[600px] bg-gray-900 text-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-purple-600 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={18} />
              <h3 className="font-semibold text-sm">Query Devtools</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 p-1 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stats */}
          <div className="p-3 bg-gray-800 border-b border-gray-700">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Cached Queries</div>
                <div className="text-xl font-bold">{stats.size}</div>
              </div>
              <div>
                <div className="text-gray-400">Active Queries</div>
                <div className="text-xl font-bold text-green-400">{stats.activeQueries}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-3 bg-gray-800 border-b border-gray-700 flex gap-2">
            <button
              onClick={handleInvalidateAll}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-xs font-medium transition-colors"
            >
              <RefreshCw size={14} />
              Invalidate All
            </button>
            <button
              onClick={handleClearCache}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-xs font-medium transition-colors"
            >
              <Trash2 size={14} />
              Clear Cache
            </button>
          </div>

          {/* Cache entries */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-gray-400 mb-2 font-semibold">Cached Queries</div>
            {cacheData.size === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">No cached queries</div>
            ) : (
              <div className="space-y-2">
                {Array.from(cacheData.entries()).map(([key, entry]) => {
                  const age = Date.now() - entry.timestamp;
                  const ageMinutes = Math.floor(age / 60000);
                  const ageSeconds = Math.floor((age % 60000) / 1000);
                  const isStale = age > entry.staleTime;

                  return (
                    <div
                      key={key}
                      className="bg-gray-800 rounded p-2 border border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono text-purple-300 break-all">
                            {key}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            Age: {ageMinutes}m {ageSeconds}s
                            {isStale && (
                              <span className="ml-2 text-orange-400">• Stale</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            queryClient.invalidateQueries({ queryKey: key, exact: true });
                            console.log('🔄 Invalidated query:', key);
                          }}
                          className="flex-shrink-0 text-blue-400 hover:text-blue-300 transition-colors"
                          title="Invalidate this query"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 bg-gray-800 border-t border-gray-700 text-[10px] text-gray-500 text-center">
            Development Mode Only
          </div>
        </div>
      )}
    </>
  );
}

// Export global cache debugging utilities for browser console
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__PROMETHIA_CACHE__ = {
    inspect: () => {
      const cache = queryClient.inspect();
      console.table(
        Array.from(cache.entries()).map(([key, entry]) => ({
          key,
          age: `${Math.floor((Date.now() - entry.timestamp) / 1000)}s`,
          stale: Date.now() - entry.timestamp > entry.staleTime
        }))
      );
      return cache;
    },
    clear: () => {
      queryClient.clear();
      console.log('🧹 Cache cleared');
    },
    invalidate: (key: string) => {
      queryClient.invalidateQueries({ queryKey: key });
      console.log('🔄 Invalidated:', key);
    },
    invalidateEntity: (entity: string) => {
      queryClient.invalidateEntity(entity);
      console.log('🔄 Invalidated entity:', entity);
    },
    stats: () => {
      const stats = queryClient.getStats();
      console.log('📊 Cache Stats:', stats);
      return stats;
    }
  };

  console.log(
    '%c[Promethia Devtools]',
    'color: #8b5cf6; font-weight: bold',
    'Query cache debugging utilities available at window.__PROMETHIA_CACHE__'
  );
}
