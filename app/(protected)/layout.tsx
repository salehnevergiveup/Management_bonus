"use client";

import { SidebarProvider } from "@components/ui/sidebar";
import AppSidebar from "@components/sidebar";
import { Navbar } from "@components/navbar";
import { UserProvider } from "@/contexts/usercontext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import  SSEComponent  from "@components/event-listener";

//
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
        <div className="flex flex-col h-screen">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <SidebarProvider>
              <AppSidebar />
              <main className="flex-1 p-4 overflow-auto">
                {children}
                <SSEComponent/>
                <ToastContainer />
              </main>
            </SidebarProvider>
          </div>
        </div>
    </UserProvider>
  );
}