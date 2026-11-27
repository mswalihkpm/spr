import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppIntro from '@/components/ui/AppIntro';
import AppUpdateNotification from '@/components/ui/AppUpdateNotification';
import { AppBootstrapProvider } from '@/context/AppBootstrapContext';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: 'SPR — Students Performance Rate | Madin School of Excellence',
  description: 'Enterprise institution-wide student performance management and analytics platform for Madin School of Excellence.',
  applicationName: 'SPR Madin',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SPR Madin',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icon-128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icon-72.png', sizes: '72x72', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  authors: [{ name: 'Madin School of Excellence' }],
};

export const viewport: Viewport = {
  themeColor: '#0A2540',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9666721228029586"
          crossOrigin="anonymous"
        />

        {/* Apple iOS Native WebApp Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SPR Madin" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icon-128.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icon-72.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />

        {/* Early Theme Detector Script to avoid Flash of Unstyled Content */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('spr_theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />

        {/* Early PWA Event Interceptor & SW Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Native Android container detection without exposing raw FCM tokens
                try {
                  var searchParams = new URLSearchParams(window.location.search);
                  var rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
                  var hashParams = new URLSearchParams(rawHash);

                  var isNativeApp = searchParams.get('spr_native') === '1' || hashParams.get('spr_native') === '1';
                  var nativeOsPerm = hashParams.get('native_os_perm') || searchParams.get('native_os_perm');
                  var cleanNeeded = false;

                  // Safely strip legacy or misplaced token query/hash parameters without persisting them in web storage
                  if (hashParams.has('native_fcm_token') || searchParams.has('native_fcm_token')) {
                    hashParams.delete('native_fcm_token');
                    searchParams.delete('native_fcm_token');
                    cleanNeeded = true;
                  }

                  if (isNativeApp) {
                    localStorage.setItem('spr_is_native_app', '1');
                    localStorage.setItem('spr_subscription_type', 'ANDROID_NATIVE');
                    // Ensure no raw native FCM token is retained in JavaScript storage
                    localStorage.removeItem('spr_fcm_token');
                    searchParams.delete('spr_native');
                    hashParams.delete('spr_native');
                    cleanNeeded = true;
                  }

                  if (nativeOsPerm && (nativeOsPerm === 'granted' || nativeOsPerm === 'denied')) {
                    localStorage.setItem('spr_native_os_permission', nativeOsPerm);
                    hashParams.delete('native_os_perm');
                    searchParams.delete('native_os_perm');
                    cleanNeeded = true;
                  }

                  if (cleanNeeded) {
                    var newSearch = searchParams.toString();
                    var newHash = hashParams.toString();
                    var newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + (newHash ? '#' + newHash : '');
                    window.history.replaceState({}, '', newUrl);
                  }
                } catch(e) {}

                window.__deferredPrompt = null;
                window.addEventListener('beforeinstallprompt', function(e) {
                  e.preventDefault();
                  window.__deferredPrompt = e;
                  try {
                    window.dispatchEvent(new CustomEvent('spr-deferred-prompt-ready', { detail: e }));
                  } catch(err) {}
                });

                window.addEventListener('appinstalled', function() {
                  window.__deferredPrompt = null;
                  window.__pwaInstalled = true;
                  try {
                    window.dispatchEvent(new CustomEvent('spr-app-installed'));
                  } catch(err) {}
                });

                if ('serviceWorker' in navigator) {
                  var registerSW = function() {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                      .then(function(reg) {
                        // Periodic check for SW updates
                        reg.addEventListener('updatefound', function() {
                          var newWorker = reg.installing;
                          if (newWorker) {
                            newWorker.addEventListener('statechange', function() {
                              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                window.dispatchEvent(new CustomEvent('spr-sw-updated'));
                              }
                            });
                          }
                        });
                      })
                      .catch(function(err) {
                        console.warn('PWA SW register error:', err);
                      });
                  };

                  if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    registerSW();
                  } else {
                    window.addEventListener('load', registerSW);
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#080e1e] text-slate-900 dark:text-slate-100 antialiased selection:bg-madin-900 selection:text-white transition-colors duration-300">
        <ThemeProvider>
          <AppBootstrapProvider>
            <AppIntro />
            {children}
            <AppUpdateNotification />
          </AppBootstrapProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
