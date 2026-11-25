'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  QrCode,
  X,
  RefreshCw,
} from 'lucide-react';

export type CameraPermissionState = 'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported';

export const CAMERA_CHOICE_STORAGE_KEY = 'spr_admin_camera_choice';
export const CAMERA_SESSION_DENIED_KEY = 'spr_admin_camera_session_denied';
export const CAMERA_PERMISSION_EVENT = 'spr-camera-permission-changed';
export const CAMERA_PERMISSION_OPEN_EVENT = 'spr-open-camera-permission-modal';

export function openAdminCameraPermissionModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CAMERA_PERMISSION_OPEN_EVENT));
  }
}

async function resolveBrowserCameraStatus(): Promise<CameraPermissionState> {
  if (typeof window === 'undefined') return 'checking';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return 'unsupported';
  }

  let browserState: PermissionState | 'unknown' = 'unknown';
  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      browserState = result.state;
    }
  } catch {
    browserState = 'unknown';
  }

  if (browserState === 'granted') {
    return 'granted';
  }

  const savedChoice = localStorage.getItem(CAMERA_CHOICE_STORAGE_KEY);
  if (browserState === 'denied' || savedChoice === 'denied') {
    return 'denied';
  }
  if (savedChoice === 'allowed' && browserState === 'unknown') {
    return 'granted';
  }
  return 'prompt';
}

export function AdminCameraPermissionButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<CameraPermissionState>('checking');

  const syncStatus = useCallback(async () => {
    const resolved = await resolveBrowserCameraStatus();
    setStatus(resolved);
  }, []);

  useEffect(() => {
    syncStatus();
    const onChanged = () => {
      syncStatus();
    };
    window.addEventListener(CAMERA_PERMISSION_EVENT, onChanged);
    return () => {
      window.removeEventListener(CAMERA_PERMISSION_EVENT, onChanged);
    };
  }, [syncStatus]);

  const isGranted = status === 'granted';
  const isDenied = status === 'denied';

  if (compact) {
    return (
      <button
        type="button"
        onClick={openAdminCameraPermissionModal}
        className={`p-2 min-h-touch min-w-touch rounded-xl flex items-center justify-center transition cursor-pointer ${
          isGranted
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            : isDenied
            ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
            : 'bg-amber-500/20 text-amber-200 border border-amber-400/40 animate-pulse'
        }`}
        title={`Camera Permission: ${isGranted ? 'Allowed' : isDenied ? 'Denied' : 'Tap to Allow / Deny'}`}
        aria-label="Camera Permission Settings"
      >
        {isGranted ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAdminCameraPermissionModal}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition cursor-pointer ${
        isGranted
          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
          : isDenied
          ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
      }`}
      title="Manage Admin Camera Permission (Allow / Deny)"
    >
      {isGranted ? (
        <>
          <Camera className="w-3.5 h-3.5 text-emerald-600" />
          <span>Camera: Allowed</span>
        </>
      ) : isDenied ? (
        <>
          <CameraOff className="w-3.5 h-3.5 text-rose-600" />
          <span>Camera: Denied</span>
        </>
      ) : (
        <>
          <Camera className="w-3.5 h-3.5 text-amber-600" />
          <span>Camera Access</span>
        </>
      )}
    </button>
  );
}

export default function AdminCameraPermissionManager({ user }: { user: any }) {
  const [status, setStatus] = useState<CameraPermissionState>('checking');
  const [modalOpen, setModalOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const checkCameraPermission = useCallback(async (autoPromptIfNeeded: boolean) => {
    if (typeof window === 'undefined') return;

    const resolved = await resolveBrowserCameraStatus();
    setStatus(resolved);

    if (resolved === 'granted') {
      localStorage.setItem(CAMERA_CHOICE_STORAGE_KEY, 'allowed');
      sessionStorage.removeItem(CAMERA_SESSION_DENIED_KEY);
      if (autoPromptIfNeeded) setModalOpen(false);
      window.dispatchEvent(new CustomEvent(CAMERA_PERMISSION_EVENT, { detail: { status: 'granted' } }));
      return;
    }

    if (resolved === 'unsupported') {
      return;
    }

    // Listen to native permission changes when supported
    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        const permStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        permStatus.onchange = () => {
          checkCameraPermission(false);
        };
      }
    } catch {
      // Ignored on Safari/iOS
    }

    const sessionDenied = sessionStorage.getItem(CAMERA_SESSION_DENIED_KEY) === '1';
    if (autoPromptIfNeeded && !sessionDenied) {
      setModalOpen(true);
    }
  }, []);

  // Automatically check and prompt when Admin opens the panel without camera permission allowed
  useEffect(() => {
    if (!user) return;
    checkCameraPermission(true);

    const onSync = () => {
      checkCameraPermission(false);
    };
    const onOpenModal = () => {
      setErrorMsg(null);
      setSuccessMsg(null);
      checkCameraPermission(false);
      setModalOpen(true);
    };

    window.addEventListener(CAMERA_PERMISSION_EVENT, onSync);
    window.addEventListener(CAMERA_PERMISSION_OPEN_EVENT, onOpenModal);
    return () => {
      window.removeEventListener(CAMERA_PERMISSION_EVENT, onSync);
      window.removeEventListener(CAMERA_PERMISSION_OPEN_EVENT, onOpenModal);
    };
  }, [user, checkCameraPermission]);

  const handleAllowCamera = async () => {
    setRequesting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera API is unavailable. Make sure you are accessing the Admin Panel over a secure HTTPS connection.'
        );
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (constraintErr: any) {
        if (
          constraintErr?.name === 'OverconstrainedError' ||
          constraintErr?.name === 'NotFoundError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } else {
          throw constraintErr;
        }
      }

      // Stop hardware camera immediately after securing permission
      stream.getTracks().forEach((track) => track.stop());

      localStorage.setItem(CAMERA_CHOICE_STORAGE_KEY, 'allowed');
      sessionStorage.removeItem(CAMERA_SESSION_DENIED_KEY);
      setStatus('granted');
      setSuccessMsg('Camera permission allowed! QR scanning is now ready.');
      window.dispatchEvent(new CustomEvent(CAMERA_PERMISSION_EVENT, { detail: { status: 'granted' } }));

      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
      }, 900);
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('denied');
        setErrorMsg(
          'Camera access was blocked by your browser or device settings. Click the lock/camera icon in the address bar (or App Info → Permissions → Camera on Android) to set Camera to Allow, then click Retry Allow.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMsg(
          'No physical camera device was detected on this device. You can choose Deny and still use the 8-Digit Security Code mode.'
        );
      } else {
        setErrorMsg(err?.message || 'Unable to access camera. Please check browser camera permissions.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleDenyCamera = () => {
    localStorage.setItem(CAMERA_CHOICE_STORAGE_KEY, 'denied');
    sessionStorage.setItem(CAMERA_SESSION_DENIED_KEY, '1');
    setStatus('denied');
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(false);
    window.dispatchEvent(new CustomEvent(CAMERA_PERMISSION_EVENT, { detail: { status: 'denied' } }));
  };

  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-camera-permission-title"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
        {/* Institutional Header */}
        <div className="bg-gradient-to-r from-madin-900 via-blue-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center relative shrink-0">
              <Camera className="w-5 h-5 text-sky-300" />
              <QrCode className="w-3.5 h-3.5 text-gold-400 absolute -bottom-1 -right-1 bg-slate-900 rounded p-0.5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gold-400">
                Admin Panel Permission
              </span>
              <h3
                id="admin-camera-permission-title"
                className="text-base font-black tracking-tight leading-tight"
              >
                Camera Access Permission
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDenyCamera}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            aria-label="Close and deny for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider">
              Current Camera Status
            </span>
            {status === 'granted' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Allowed</span>
              </span>
            ) : status === 'denied' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[11px]">
                <CameraOff className="w-3.5 h-3.5" />
                <span>Denied</span>
              </span>
            ) : status === 'unsupported' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[11px]">
                <span>Unavailable (Requires HTTPS)</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Not Allowed Yet</span>
              </span>
            )}
          </div>

          <p className="text-slate-600 leading-relaxed text-[13px]">
            Allow camera access so the Admin &amp; Store QR scanner can immediately scan student
            digital ID cards without interruption. Choose <strong>Allow</strong> to enable
            camera scanning or <strong>Deny</strong> to continue without camera access.
          </p>

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 font-medium leading-relaxed flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons: ALLOW & DENY */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleDenyCamera}
              disabled={requesting}
              className="py-3 px-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 font-black text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              <span>Deny</span>
            </button>

            <button
              type="button"
              onClick={handleAllowCamera}
              disabled={requesting || status === 'unsupported'}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {requesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Requesting...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>{errorMsg ? 'Retry Allow' : 'Allow'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
