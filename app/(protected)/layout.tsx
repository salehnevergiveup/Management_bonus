"use client";

import { SidebarProvider } from "@components/ui/sidebar";
import AppSidebar from "@components/sidebar";
import { Navbar } from "@components/navbar";
import { UserProvider } from "@/contexts/usercontext";
import { LanguageProvider } from "@app/contexts/LanguageContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SSEComponent from "@components/event-listener";
import FloatingProcessButton from "@components/floating-process-button";
import FormLoader from "@components/forms-loader";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <SidebarProvider>
        <LanguageProvider> {/* 👈 WRAP LANGUAGE CONTEXT HERE */}
          <div className="flex flex-col min-h-screen w-full">
            {/* Navbar spans full width */}
            <Navbar className="w-full z-20" />

            {/* Content area with sidebar and main content properly aligned */}
            <div className="flex flex-1">
              {/* Sidebar */}
              <AppSidebar className="z-10 shrink-0 h-full" />

              {/* Main content area */}
              <main className="flex-1 p-4 overflow-auto w-full">
                {children}
                <SSEComponent />
                <FormLoader />
                <ToastContainer />
              </main>
            </div>

            <FloatingProcessButton />
          </div>
        </LanguageProvider>
      </SidebarProvider>
    </UserProvider>
  );
}
