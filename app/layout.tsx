// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@components/sessionWrapper";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from "@/contexts/themecontext";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransferFlow Pro - Automated Player Transfer System",
  description: "Advanced automation platform for managing player transfers and bonus distributions across gaming systems",
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ThemeProvider
            defaultTheme="system"
            storageKey="app-theme"
          >
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </SessionWrapper>
  );
}
