import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppIntro from '@/components/ui/AppIntro';
import PWAInstallPrompt from '@/components/ui/PWAInstallPrompt';

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
  maximumScale: 1,
  userScalable: false,
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        
        {/* Apple iOS WebKit Native PWA Meta Tags */}
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
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-madin-900 selection:text-white">
        <AppIntro />
        {children}
        <PWAInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
