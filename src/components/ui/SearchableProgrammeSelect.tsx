'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Trophy, Check, X, ChevronDown, Sparkles } from 'lucide-react';

export interface ProgrammeHistoryItem {
  name: string;
  basePoint: number;
  maxScore: number;
  eventName?: string;
  levelId?: string;
  levelName?: string;
  categoryCode: string;
  categoryName: string;
  usageCount: number;
}

interface SearchableProgrammeSelectProps {
  value: string;
  onChange: (name: string, basePoint?: number, levelId?: string, eventName?: string) => void;
  onBasePointsChange?: (basePoint: number) => void;
  categoryType?: 'LITERARY' | 'PROGRAMS' | 'ALL';
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Module-level cache to prevent re-fetching on multiple row renders
const programmeCache = new Map<string, ProgrammeHistoryItem[]>();

export default function SearchableProgrammeSelect({
  value,
  onChange,
  onBasePointsChange,
  categoryType = 'LITERARY',
  placeholder = 'Select or search programme...',
  className = '',
  required = false,
}: SearchableProgrammeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [programmes, setProgrammes] = useState<ProgrammeHistoryItem[]>(() => {
    return programmeCache.get(categoryType) || [];
  });
  const [loading, setLoading] = useState(programmes.length === 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const cached = programmeCache.get(categoryType);
    if (cached && cached.length > 0) {
      setProgrammes(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const catParam = categoryType === 'ALL' ? '' : `category=${categoryType}`;
    fetch(`/api/scores/programmes-history?${catParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.programmes) {
          programmeCache.set(categoryType, data.programmes);
          setProgrammes(data.programmes);
        }
      })
      .catch((err) => console.error('Error fetching programmes history:', err))
      .finally(() => setLoading(false));
  }, [categoryType]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProgrammes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return programmes;
    return programmes.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.eventName && p.eventName.toLowerCase().includes(term))
    );
  }, [programmes, searchTerm]);

  const handleSelect = (item: ProgrammeHistoryItem) => {
    setSearchTerm(item.name);
    onChange(item.name, item.basePoint, item.levelId, item.eventName);
    if (onBasePointsChange && typeof item.basePoint === 'number') {
      onBasePointsChange(item.basePoint);
    }
    setIsOpen(false);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    onChange('');
    inputRef.current?.focus();
  };

  const exactMatch = programmes.some(
    (p) => p.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleCustomInput}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full pl-3 pr-16 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
        />

        <div className="absolute right-2 flex items-center space-x-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown with Previous Record Base Points */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[120] max-h-72 overflow-y-auto animate-scale-in">
          {/* Header notice explaining the feature */}
          <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-bold">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Programmes with Historical Base Points</span>
            </span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono">
              {filteredProgrammes.length} found
            </span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400">Loading programmes...</div>
          ) : filteredProgrammes.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProgrammes.map((item) => {
                const isSelected = item.name.toLowerCase() === value?.toLowerCase();
                return (
                  <button
                    key={`${item.categoryCode}-${item.name}-${item.eventName || ''}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex items-center space-x-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center space-x-1.5">
                        {item.eventName && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium text-slate-600 dark:text-slate-300">
                            {item.eventName}
                          </span>
                        )}
                        {item.levelName && (
                          <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[9.5px]">
                            {item.levelName}
                          </span>
                        )}
                        {item.usageCount > 0 && (
                          <span className="text-slate-400">• {item.usageCount} entries logged</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      {/* Base Point Badge (Admin Valuation Memory) */}
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-mono font-black text-[11px] shadow-2xs">
                        Base: {item.basePoint} pts
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching previous programme found.
            </div>
          )}

          {/* Option to use newly typed custom programme name */}
          {searchTerm.trim() && !exactMatch && (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  onChange(searchTerm.trim());
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-xl transition flex items-center justify-between"
              >
                <span>Use &ldquo;{searchTerm.trim()}&rdquo; as new programme</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md">New</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
