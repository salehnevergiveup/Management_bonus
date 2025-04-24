// 1. First, let's update ProtectedLayout.tsx to just include the FloatingProcessButton without passing data
"use client";

import { SidebarProvider } from "@components/ui/sidebar";
import AppSidebar from "@components/sidebar";
import { Navbar } from "@components/navbar";
import { UserProvider } from "@/contexts/usercontext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SSEComponent from "@components/event-listener";
import FloatingProcessButton from "@components/floating-process-button";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <SidebarProvider>
        <div className="flex flex-col min-h-screen w-full">
          {/* Navbar spans full width */}
          <Navbar className="w-full z-20" />
          
          {/* Content area with sidebar and main content properly aligned */}
          <div className="flex flex-1">
            {/* Sidebar */}
            <AppSidebar className="z-10 shrink-0 h-full" />
            
            {/* Main content area - proper width calculation */}
            <main className="flex-1 p-4 overflow-auto w-full">
              {children}
              <SSEComponent/>
              <ToastContainer />
            </main>
          </div>
          
          <FloatingProcessButton/>
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}