"use client";

import { SidebarProvider } from "@components/ui/sidebar";
import AppSidebar  from "@components/sidebar";
import { Navbar } from "@components/navbar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1 p-4 overflow-auto">
            {children}
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
}
