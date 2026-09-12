'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string | React.ReactNode;
  textLabel?: string;
  group?: string;
  badge?: string | React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string | number | undefined;
  onChange: (val: string) => void;
  options: (SelectOption | { value: string | number; label: string | React.ReactNode })[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  searchable?: boolean;
  icon?: React.ReactNode;
  id?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  searchable,
  icon,
  id,
  name,
  size = 'md',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Flatten and normalize options
  const normalizedOptions: SelectOption[] = React.useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value,
          label: opt.label,
          textLabel: typeof opt.label === 'string' ? opt.label : String(opt.value),
          group: (opt as SelectOption).group,
          badge: (opt as SelectOption).badge,
          disabled: (opt as SelectOption).disabled,
        };
      }
      return {
        value: String(opt),
        label: String(opt),
        textLabel: String(opt),
      };
    });
  }, [options]);

  // Selected option
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Determine if searchable
  const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length > 7;

  // Filtered options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const txt = opt.textLabel || (typeof opt.label === 'string' ? opt.label : String(opt.value));
      return txt.toLowerCase().includes(term);
    });
  }, [normalizedOptions, searchTerm]);

  // Group filtered options if grouping is used
  const groupedOptions = React.useMemo(() => {
    const groups: { [key: string]: SelectOption[] } = {};
    const ungrouped: SelectOption[] = [];

    filteredOptions.forEach((opt) => {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        ungrouped.push(opt);
      }
    });

    return { groups, ungrouped };
  }, [filteredOptions]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (!isOpen) {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen, isSearchable]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const opt = filteredOptions[highlightedIndex];
        if (!opt.disabled) {
          onChange(String(opt.value));
          setIsOpen(false);
        }
      }
    }
  };

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(String(opt.value));
    setIsOpen(false);
    setSearchTerm('');
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg min-h-[32px]',
    md: 'px-3 py-2 text-xs font-semibold rounded-xl min-h-[38px]',
    lg: 'px-4 py-2.5 text-sm font-semibold rounded-2xl min-h-[44px]',
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-left select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for HTML forms if name prop provided */}
      {name && <input type="hidden" name={name} value={value !== undefined ? String(value) : ''} />}

      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 bg-white text-slate-900 border transition-all duration-200 shadow-2xs outline-none ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'cursor-pointer'} ${sizeClasses} ${triggerClassName}`}
      >
        <div className="flex items-center space-x-2 truncate">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          <span className={`truncate ${!selectedOption ? 'text-slate-400 font-normal' : 'text-slate-900 font-semibold'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0 ml-1">
          {selectedOption?.badge && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 mt-1.5 z-50 min-w-[200px] max-h-64 overflow-hidden bg-white border border-slate-200/90 rounded-2xl shadow-xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-150 flex flex-col ${menuClassName}`}
        >
          {/* Search Box */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div ref={optionsListRef} className="overflow-y-auto p-1.5 space-y-0.5 max-h-52 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                No matching options found
              </div>
            ) : (
              <>
                {/* Ungrouped options */}
                {groupedOptions.ungrouped.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors duration-150 ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : isSelected
                          ? 'bg-blue-50 text-blue-900 font-bold'
                          : isHighlighted
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="truncate">{opt.label}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        {opt.badge && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </div>
                    </div>
                  );
                })}

                {/* Grouped options */}
                {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="pt-1.5 first:pt-0">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 rounded-lg">
                      {groupName}
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {groupOpts.map((opt, idx) => {
                        const isSelected = String(opt.value) === String(value);
                        return (
                          <div
                            key={`${opt.value}-${idx}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelect(opt)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors duration-150 ${
                              opt.disabled
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : isSelected
                                ? 'bg-blue-50 text-blue-900 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <span className="truncate">{opt.label}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              {opt.badge && (
                                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {opt.badge}
                                </span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
