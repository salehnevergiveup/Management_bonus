"use client"

import { useState } from "react"
import { Bell, ChevronDown, Menu } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@components/ui/button"
import { signOut } from "next-auth/react"
import { useUser } from "@/contexts/usercontext"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSidebar } from "@components/ui/sidebar"
import Link from "next/link"
import { NotificationPanel } from "./ui/notification-panel"
import { cn } from "@/lib/utils" // Make sure you have this utility

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar"
import { error } from "console"

export function Navbar({ className, ...props }:  {className: any}) {
  const { auth, isLoading } = useUser()
  const isMobile = useIsMobile()
  const { setOpenMobile } = useSidebar()
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  useEffect(() => {  
      const notificationsCount = async()  => { 
        try { 
          const res  = await fetch("/api/notifications/count");  
          if(!res.ok) {  
            throw new Error("Failed to fetch notifications");
          } 
          const data  = await res.json();

          if(!data?.count ==  undefined) {  
            throw new Error("Failed to fetch the count");
          }

          setUnreadNotificationCount(data.count);

        } catch(error) {  
          console.error(error); 
        }
      }

      notificationsCount(); 
                              
  },[]); 

  if (isLoading) {
    return (
      <header className={cn("flex h-16 w-full items-center justify-between border-b bg-background px-4", className)} {...props}>
        <div className="flex items-center gap-2">Loading...</div>
      </header>
    )
  }

  return (
    <header className={cn("flex h-16 w-full items-center justify-between border-b bg-background px-4 relative", className)} {...props}>
      <div className="flex items-center gap-2">
        {/* Mobile menu trigger */}
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setOpenMobile(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
          
        )}
        {!isMobile && (
              <span className="text-lg font-semibold truncate">Management Dashboard</span>
        )}
    
      </div>
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <Button variant="outline" size="icon" className="relative" onClick={() => setIsNotificationPanelOpen(true)}>
          <Bell className="h-5 w-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {unreadNotificationCount}
            </span>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 p-1 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={auth?.picture || ""} alt={auth?.name || "User"} />
                <AvatarFallback>{auth?.name ? auth.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">{auth?.name || "Guest"}</span>
                <span className="text-xs text-muted-foreground">{auth?.email || "guest@example.com"}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-50">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={auth?.picture || ""} alt={auth?.name || "User"} />
                <AvatarFallback>{auth?.name ? auth.name.substring(0, 1).toUpperCase() : "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{auth?.name || "Guest"}</span>
                <span className="text-xs text-muted-foreground">{auth?.email || "guest@example.com"}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <Link href={`/profile`}>
              <DropdownMenuItem>
                <span>My Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onUpdateUnreadCount={setUnreadNotificationCount}
      />
    </header>
  )
}