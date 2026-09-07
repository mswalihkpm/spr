'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  User,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Sliders,
  Award,
  Layers,
  BarChart3,
  Tv,
  Settings,
  X,
  ArrowRight,
} from 'lucide-react';
import { StudentAvatar } from '@/components/ui/StudentAvatar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setStudents([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let res = await fetch(`/api/students?search=${encodeURIComponent(query.trim())}&limit=8`, {
          signal: controller.signal,
        });
        if (res.status === 401) {
          res = await fetch(`/api/public/search?q=${encodeURIComponent(query.trim())}`, {
            signal: controller.signal,
          });
        }
        const data = await res.json();
        if (data.students) {
          setStudents(data.students);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const navShortcuts = [
    { title: 'Dashboard', path: '/dashboard', icon: BarChart3, category: 'Navigation' },
    { title: 'Student Management', path: '/students', icon: User, category: 'Navigation' },
    { title: 'Bulk Excel Import', path: '/students/bulk-import', icon: Layers, category: 'Action' },
    { title: 'Islamic Studies (Jamiathul Hind / Ma\'din)', path: '/academics/islamic', icon: BookOpen, category: 'Academics' },
    { title: 'School Studies (Kerala / NCERT)', path: '/academics/school', icon: GraduationCap, category: 'Academics' },
    { title: 'Programs & Competitions', path: '/programs', icon: Trophy, category: 'Co-Curricular' },
    { title: 'Creative Hub (Articles, Poems)', path: '/creative-hub', icon: Sparkles, category: 'Co-Curricular' },
    { title: 'Literary Programs (Sahityotsav, Jamia Maharjan)', path: '/literary', icon: Feather, category: 'Co-Curricular' },
    { title: 'Library / Reading (Kuthbakhana)', path: '/library', icon: Library, category: 'Library' },
    { title: 'Custom Categories Builder', path: '/categories', icon: Award, category: 'System' },
    { title: 'Weight Management & SPR Rules', path: '/weights', icon: Sliders, category: 'System' },
    { title: 'Leaderboards (Overall & Champions)', path: '/leaderboard', icon: Award, category: 'Reports' },
    { title: 'Institutional Analytics', path: '/analytics', icon: BarChart3, category: 'Reports' },
    { title: 'Settings & Master Data', path: '/settings', icon: Settings, category: 'System' },
  ];

  const filteredShortcuts = query.trim()
    ? navShortcuts.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()) || s.category.toLowerCase().includes(query.toLowerCase()))
    : navShortcuts.slice(0, 6);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-madin-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, schools, classes, modules, or actions... (Esc to exit)"
            className="w-full text-base bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-sans"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Students results */}
          {students.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Students ({students.length})
              </div>
              <div className="space-y-1">
                {students.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      router.push(`/students/${st.id}`);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <StudentAvatar
                        fullName={st.fullName}
                        photoUrl={st.photoUrl}
                        size="sm"
                        className="shadow-sm"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-900 flex items-center space-x-2">
                          <span>{st.fullName}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {st.class?.name} • {st.school?.name} (Div {st.division})
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation and shortcuts */}
          {filteredShortcuts.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
                {query.trim() ? 'Modules & Quick Actions' : 'Quick Jump'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredShortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        router.push(item.path);
                        onClose();
                      }}
                      className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-left transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-800 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 group-hover:text-blue-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400">{item.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query.trim() && students.length === 0 && filteredShortcuts.length === 0 && !loading && (
            <div className="py-10 text-center text-slate-500">
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by student name, class, or system section.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Madin School of Excellence — SPR Platform</span>
          <span>Press ESC or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
}
