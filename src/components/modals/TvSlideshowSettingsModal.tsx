'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Clock,
  Layers,
  Sparkles,
  Sliders,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
  Eye,
  Tv,
  Save,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { TvSlideshowSettings, TvSlideImage } from '@/types';
import { DEFAULT_TV_SLIDESHOW_SETTINGS } from '@/lib/tv-slideshow-config';

interface TvSlideshowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: TvSlideshowSettings, newImages: TvSlideImage[]) => void;
}

export default function TvSlideshowSettingsModal({
  isOpen,
  onClose,
  onSettingsSaved,
}: TvSlideshowSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'IMAGES' | 'TIMING' | 'LAYOUT'>('IMAGES');

  // Settings & Images state
  const [settings, setSettings] = useState<TvSlideshowSettings>(DEFAULT_TV_SLIDESHOW_SETTINGS);
  const [images, setImages] = useState<TvSlideImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New image upload form state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageTitle, setNewImageTitle] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');
  const [newImageDuration, setNewImageDuration] = useState<number>(8);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing settings when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    fetch('/api/display/settings')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.settings) setSettings(data.settings);
        if (data.images) setImages(data.images);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load slideshow settings:', err);
        setErrorMsg('Failed to fetch existing slideshow settings.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle image upload via file input
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.).');
      return;
    }

    try {
      setUploadingImage(true);
      setErrorMsg(null);

      // Read as base64 for upload
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Data,
              type: 'banner',
              isBanner: true,
            }),
          });

          const data = await res.json();
          if (res.ok && data.url) {
            setPreviewImageUrl(data.url);
          } else {
            // If upload fails, fallback to local base64 preview
            setPreviewImageUrl(base64Data);
          }
        } catch (uploadErr: any) {
          console.warn('Direct upload error, falling back to base64 preview:', uploadErr);
          setPreviewImageUrl(reader.result as string);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('File read error:', err);
      setUploadingImage(false);
      setErrorMsg('Failed to read image file.');
    }
  };

  // Add the uploaded image to the list
  const handleAddImageSlide = () => {
    if (!previewImageUrl) return;

    const newSlide: TvSlideImage = {
      id: `slide-img-${Date.now()}`,
      imageUrl: previewImageUrl,
      title: newImageTitle.trim() || undefined,
      caption: newImageCaption.trim() || undefined,
      duration: newImageDuration > 0 ? newImageDuration : undefined,
      active: true,
      order: images.length,
      createdAt: new Date().toISOString(),
    };

    setImages((prev) => [...prev, newSlide]);
    setPreviewImageUrl(null);
    setNewImageTitle('');
    setNewImageCaption('');
    setNewImageDuration(8);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Toggle image active
  const handleToggleImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, active: !img.active } : img))
    );
  };

  // Delete image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Reorder image
  const handleMoveImage = (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === images.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const updated = reordered.map((item, idx) => ({ ...item, order: idx }));
    setImages(updated);
  };

  // Save all settings and images
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      setSavedSuccess(false);

      const res = await fetch('/api/display/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save slideshow settings.');
      }

      setSavedSuccess(true);
      if (onSettingsSaved) {
        onSettingsSaved(data.settings || settings, data.images || images);
      }
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving slideshow settings:', err);
      setErrorMsg(err.message || 'Error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Tv className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>TV Slideshow Settings & Images</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Customizer
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage display intervals, transition themes, and custom banner slide images
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-8 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('IMAGES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'IMAGES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Slides ({images.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TIMING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'TIMING'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Time Management</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LAYOUT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              activeTab === 'LAYOUT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Layout & Themes</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-slide-down">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Slideshow settings saved successfully! Live TV broadcast will update immediately.</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading slideshow configuration...</span>
            </div>
          ) : (
            <>
              {/* =========================================================================
                  TAB 1: IMAGES & BANNER SLIDES
                  ========================================================================= */}
              {activeTab === 'IMAGES' && (
                <div className="space-y-6">
                  {/* Upload Card */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Add New Image Slide (Posters, Announcements & Felicitations)</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Image Dropzone / Preview */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-4 bg-white dark:bg-slate-900/60 min-h-[160px] text-center relative overflow-hidden transition">
                        {previewImageUrl ? (
                          <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img
                              src={previewImageUrl}
                              alt="Slide preview"
                              className="max-h-36 w-auto object-contain rounded-xl shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImageUrl(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-lg hover:bg-rose-600 transition"
                              title="Remove preview"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center space-y-2 w-full h-full justify-center">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                              {uploadingImage ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Upload className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {uploadingImage ? 'Optimizing Image...' : 'Click to Upload Image'}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                High-res 16:9 or 4:3 images (Auto WebP optimized)
                              </p>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                        )}
                      </div>

                      {/* Title, Caption & Duration fields */}
                      <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Headline / Title (Optional)
                            </label>
                            <input
                              type="text"
                              value={newImageTitle}
                              onChange={(e) => setNewImageTitle(e.target.value)}
                              placeholder="e.g. Sahityotsav Champions or Ramadan Quiz Winners"
                              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Subtitle / Caption (Optional)
                            </label>
                            <input
                              type="text"
                              value={newImageCaption}
                              onChange={(e) => setNewImageCaption(e.target.value)}
                              placeholder="e.g. Hearty congratulations from Madin School of Excellence"
                              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                              Slide Duration ({newImageDuration} seconds)
                            </label>
                            <input
                              type="range"
                              min="4"
                              max="30"
                              step="1"
                              value={newImageDuration}
                              onChange={(e) => setNewImageDuration(parseInt(e.target.value, 10))}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddImageSlide}
                          disabled={!previewImageUrl || uploadingImage}
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Insert Slide into Deck</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mode & Interleave Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Slideshow Display Mode
                      </label>
                      <select
                        value={settings.mode}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            mode: e.target.value as any,
                          }))
                        }
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600"
                      >
                        <option value="BOTH">Show Both Leaderboard & Custom Images</option>
                        <option value="LEADERBOARD_ONLY">Show Leaderboard Slides Only</option>
                        <option value="IMAGES_ONLY">Show Custom Images Slides Only</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Control whether custom media slides are mixed with ranked student slides.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Image Mixing Sequence
                      </label>
                      <select
                        value={settings.interleaveMode}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            interleaveMode: e.target.value as any,
                          }))
                        }
                        disabled={settings.mode !== 'BOTH'}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600 disabled:opacity-50"
                      >
                        <option value="EVERY_N_SLIDES">
                          Every {settings.interleaveFrequency} Leaderboard Slide
                        </option>
                        <option value="AFTER_ALL">Show all images after full leaderboard</option>
                        <option value="BEFORE_ALL">Show all images before full leaderboard</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        How image slides appear relative to the 14-student rankings.
                      </p>
                    </div>
                  </div>

                  {/* Existing Image Slides List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Active Slides Deck ({images.length} Image Slides)
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Use arrows to reorder • Toggle to temporarily hide
                      </span>
                    </div>

                    {images.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                        No custom image slides uploaded yet. Upload an image above to include posters in the broadcast.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {images.map((img, idx) => (
                          <div
                            key={img.id}
                            className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                              img.active
                                ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                            }`}
                          >
                            {/* Left: Thumbnail & Info */}
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-300 dark:border-slate-700">
                                <img
                                  src={img.imageUrl}
                                  alt={img.title || 'Slide thumbnail'}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {img.title || `Image Slide #${idx + 1}`}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {img.caption || 'No caption set'}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                                    {img.duration || settings.imageSlideDuration}s duration
                                  </span>
                                  {!img.active && (
                                    <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Controls */}
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'UP')}
                                disabled={idx === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 transition"
                                title="Move slide up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveImage(idx, 'DOWN')}
                                disabled={idx === images.length - 1}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 transition"
                                title="Move slide down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleImage(img.id)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                                  img.active
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {img.active ? 'Active' : 'Off'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                                title="Delete image slide"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 2: TIME MANAGEMENT
                  ========================================================================= */}
              {activeTab === 'TIMING' && (
                <div className="space-y-6">
                  {/* Leaderboard Slide Duration */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>Leaderboard Slide Duration</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Time spent showing each 14-student ranking slide before advancing.
                        </p>
                      </div>
                      <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400 px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800">
                        {settings.leaderboardSlideDuration} seconds
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="3"
                        max="30"
                        step="1"
                        value={settings.leaderboardSlideDuration}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            leaderboardSlideDuration: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        {[5, 7, 10, 15].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, leaderboardSlideDuration: sec }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                              settings.leaderboardSlideDuration === sec
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Image Slide Duration */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-amber-500" />
                          <span>Default Custom Image Slide Duration</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Time spent showing posters, announcement slides, and banners.
                        </p>
                      </div>
                      <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800">
                        {settings.imageSlideDuration} seconds
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="4"
                        max="40"
                        step="1"
                        value={settings.imageSlideDuration}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            imageSlideDuration: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="flex gap-1.5 shrink-0">
                        {[6, 8, 10, 15].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, imageSlideDuration: sec }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition ${
                              settings.imageSlideDuration === sec
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notification Ticker Rotation Interval */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-indigo-500" />
                          <span>Header Notifications Ticker Speed</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Interval between announcements rotating in the TV top header.
                        </p>
                      </div>
                      <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800">
                        {settings.notificationDuration} seconds
                      </span>
                    </div>

                    <input
                      type="range"
                      min="4"
                      max="20"
                      step="1"
                      value={settings.notificationDuration}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          notificationDuration: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Background Auto-Refresh Rate */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Background Live Data Re-sync Interval
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          How frequently the TV silently updates student points without resetting the active slide.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Every {settings.autoRefreshInterval} minute{settings.autoRefreshInterval > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[1, 2, 5, 10].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, autoRefreshInterval: min }))
                          }
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                            settings.autoRefreshInterval === min
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {min} Min{min > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 3: LAYOUT & VISUAL THEMES
                  ========================================================================= */}
              {activeTab === 'LAYOUT' && (
                <div className="space-y-6">
                  {/* Students Per Slide & Columns */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span>Grid Layout & Density</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Students Per Slide
                        </label>
                        <select
                          value={settings.studentsPerSlide}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              studentsPerSlide: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600"
                        >
                          <option value="14">14 Students (7 Per Column — Recommended)</option>
                          <option value="12">12 Students (6 Per Column)</option>
                          <option value="16">16 Students (8 Per Column)</option>
                          <option value="10">10 Students (5 Per Column)</option>
                          <option value="7">7 Students (Single Column)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Column Format
                        </label>
                        <select
                          value={settings.columnLayout}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              columnLayout: e.target.value as any,
                            }))
                          }
                          className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-600"
                        >
                          <option value="TWO_COLUMNS">Two Columns (Side-by-Side)</option>
                          <option value="SINGLE_COLUMN">Single Large Column</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Transition Animation Style */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Slide Transition Style</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'SLIDE', label: 'Modern Slide', desc: 'Smooth horizontal glide' },
                        { id: 'FADE', label: 'Cinematic Fade', desc: 'Soft opacity blend' },
                        { id: 'ZOOM', label: 'Dynamic Zoom', desc: 'Subtle scale-up pulse' },
                        { id: 'FLIP', label: '3D Card Flip', desc: 'Perspectival turn' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, transitionEffect: item.id as any }))
                          }
                          className={`p-3 rounded-2xl border text-left transition ${
                            settings.transitionEffect === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <div className="text-xs font-black">{item.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              settings.transitionEffect === item.id ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {item.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Theme Palette */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Background Palette & Color Scheme
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: 'MIDNIGHT', label: 'Deep Midnight', color: 'bg-slate-950 border-slate-700' },
                        { id: 'COSMIC', label: 'Cosmic Indigo', color: 'bg-indigo-950 border-indigo-700' },
                        { id: 'GOLD', label: 'Stadium Gold', color: 'bg-amber-950 border-amber-700' },
                        { id: 'EMERALD', label: 'Emerald Aurora', color: 'bg-emerald-950 border-emerald-700' },
                      ].map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({ ...prev, theme: th.id as any }))
                          }
                          className={`p-3 rounded-2xl border transition flex items-center space-x-2.5 ${
                            settings.theme === th.id
                              ? 'ring-2 ring-blue-500 shadow-md'
                              : 'hover:border-slate-400'
                          } ${th.color}`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full border border-white/50 shrink-0 ${
                              settings.theme === th.id ? 'bg-blue-400' : 'bg-transparent'
                            }`}
                          />
                          <span className="text-xs font-bold text-white">{th.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* On-Screen HUD Toggles */}
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      On-Screen Displays (HUD)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        {
                          key: 'showProgressBar',
                          label: 'Top Slide Progress Bar',
                          desc: 'Animated gradient countdown bar at top of screen',
                        },
                        {
                          key: 'showSlideCounter',
                          label: 'Slide Number Counter',
                          desc: 'Displays "Slide X of Y" in the header',
                        },
                        {
                          key: 'showClock',
                          label: 'Live Clock & Date',
                          desc: 'Digital real-time 12-hour clock with seconds',
                        },
                        {
                          key: 'showNotificationsTicker',
                          label: 'Header Notifications Stream',
                          desc: 'Rotating ticker for announcements and news',
                        },
                      ].map((hud) => {
                        const val = (settings as any)[hud.key];
                        return (
                          <label
                            key={hud.key}
                            className="flex items-start space-x-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={val}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  [hud.key]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 w-4 h-4 rounded text-blue-600 accent-blue-600"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {hud.label}
                              </div>
                              <div className="text-[10px] text-slate-400">{hud.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Tv className="w-4 h-4 text-blue-600" />
            <span>Changes persist globally in system settings for all TV viewers.</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <a
              href="/display"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              <span>Preview Live Display</span>
            </a>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-blue-600/30 transition active:scale-95 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
