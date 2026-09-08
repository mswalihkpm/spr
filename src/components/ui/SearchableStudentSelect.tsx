'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronDown, User, X } from 'lucide-react';
import StudentAvatar from './StudentAvatar';

export interface StudentOption {
  id: string;
  fullName: string;
  studentId?: string;
  sprStudentId?: string;
  division?: string;
  photoUrl?: string | null;
  class?: {
    id?: string;
    name?: string;
  } | null;
}

interface SearchableStudentSelectProps {
  students: StudentOption[];
  value: string;
  onChange: (studentId: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function SearchableStudentSelect({
  students,
  value,
  onChange,
  placeholder = 'Search & select student by name or SPR ID...',
  label,
  required = false,
  className = '',
}: SearchableStudentSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStudent = students.find((s) => s.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = s.fullName?.toLowerCase().includes(query);
    const idMatch = s.studentId?.toLowerCase().includes(query) || s.sprStudentId?.toLowerCase().includes(query);
    const classMatch = s.class?.name?.toLowerCase().includes(query);
    const divMatch = s.division?.toLowerCase().includes(query);
    return nameMatch || idMatch || classMatch || divMatch;
  });

  // Handle open
  const handleOpen = () => {
    setIsOpen(true);
    setSearchQuery('');
    setHighlightedIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelect = (studentId: string) => {
    onChange(studentId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredStudents.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStudents[highlightedIndex]) {
        handleSelect(filteredStudents[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        onClick={handleOpen}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-900 flex items-center justify-between cursor-pointer transition focus:ring-2 focus:ring-madin-900"
        tabIndex={0}
      >
        {selectedStudent ? (
          <div className="flex items-center space-x-2.5 min-w-0">
            <StudentAvatar
              photoUrl={selectedStudent.photoUrl}
              name={selectedStudent.fullName}
              size="sm"
              className="w-6 h-6 shrink-0"
            />
            <div className="truncate">
              <span className="font-bold text-slate-900">{selectedStudent.fullName}</span>
              <span className="text-slate-500 text-[11px] ml-1.5">
                — {selectedStudent.class?.name || 'Class'} {selectedStudent.division ? `(Div ${selectedStudent.division})` : ''}
              </span>
              {selectedStudent.sprStudentId && (
                <span className="ml-2 px-1.5 py-0.2 bg-blue-100 text-blue-900 rounded font-mono text-[10px] font-bold">
                  {selectedStudent.sprStudentId}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search by student name, SPR ID, or class..."
              className="w-full bg-transparent text-xs text-slate-900 font-medium outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Student List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 p-1">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((st, index) => {
                const isSelected = st.id === value;
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={st.id}
                    onClick={() => handleSelect(st.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-madin-900 text-white font-bold'
                        : isHighlighted
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <StudentAvatar
                        photoUrl={st.photoUrl}
                        name={st.fullName}
                        size="sm"
                        className="w-6 h-6 shrink-0"
                      />
                      <div className="truncate">
                        <div className="truncate font-semibold">{st.fullName}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-gold-300' : 'text-slate-500'
                          }`}
                        >
                          {st.class?.name || 'Class'} {st.division ? `(Div ${st.division})` : ''} • ID: {st.sprStudentId || st.studentId || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-gold-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No students matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
