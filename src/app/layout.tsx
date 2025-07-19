import type { Metadata } from "next";
import "./globals.css";
import { TitleManager } from "@/components/TitleManager";
import { FaviconManager } from "@/components/FaviconManager";
import { ProgressBar } from "@/components/ProgressBar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { FontLoader } from "@/components/ui/font-loader";


export const metadata: Metadata = {
  title: "Loading...", // Will be immediately replaced by TitleManager
  description: "Mopgomglobal accommodation registration and management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        {/* Prevent any default favicon loading - FaviconManager will handle everything */}
        <meta name="msapplication-config" content="none" />

        {/* Compulsory Apercu Font Preloading - High Priority */}
        <link
          rel="preload"
          href="/fonts/ApercuPro-Regular.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ApercuPro-Medium.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ApercuPro-Bold.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />

        {/* DNS Prefetch for font optimization */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="//fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Critical Apercu Pro Font CSS - Inlined for immediate loading */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @font-face {
              font-family: 'Apercu Pro';
              src: url('/fonts/ApercuPro-Regular.woff') format('woff');
              font-weight: 400;
              font-style: normal;
              font-display: block;
            }
            @font-face {
              font-family: 'Apercu Pro';
              src: url('/fonts/ApercuPro-Medium.woff') format('woff');
              font-weight: 500;
              font-style: normal;
              font-display: block;
            }
            @font-face {
              font-family: 'Apercu Pro';
              src: url('/fonts/ApercuPro-Bold.woff') format('woff');
              font-weight: 700;
              font-style: normal;
              font-display: block;
            }
            html, body, * {
              font-family: 'Apercu Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
            }
          `
        }} />
      </head>
      <body className="font-apercu antialiased text-gray-900 bg-white" suppressHydrationWarning={true}>
        <FontLoader timeout={1000} showLoadingScreen={false}>
          <LanguageProvider>
            <ProgressBar color="#4f46e5" height={3} />
            <TitleManager />
            <FaviconManager />
            {children}
          </LanguageProvider>
        </FontLoader>
        {process.env.NODE_ENV === 'development' && (
          <div id="performance-monitor-root" />
        )}
      </body>
    </html>
  );
}
