"use client"
import type * as React from "react"
import { cn } from "@/lib/utils" // Make sure you have this utility
import Link from 'next/link';
import {
  Users,
  UserCheck,
  BarChart3,
  Wallet,
  FileText,
  Bell, 
  Home,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useUser } from "@/contexts/usercontext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  useSidebar,
} from "@components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible"
import { Button } from "@/components/ui/button"

export default function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading } = useUser()
  const { state, toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  const renderManagementMenuItems = () => {
    const sections = [
      { name: "Users", icon: <Users className="h-4 w-4" /> },
      { name: "Players", icon: <UserCheck className="h-4 w-4" /> },
      { name: "Notifications", icon: <Bell className="h-4 w-4" /> },
      { name: "Bonus", icon: <BarChart3 className="h-4 w-4" /> },
      { name: "Processes", icon: <BarChart3 className="h-4 w-4" /> },
      { name: "Matches", icon: <UserCheck className="h-4 w-4" /> },
      { name: "Transfer Accounts", icon: <Wallet className="h-4 w-4" /> },
      { name: "Requests", icon: <FileText className="h-4 w-4" /> },
    ]

    return sections
      .map((section) => {
        if (user && user.canAccess(section.name)) {
          const href = `/${section.name.toLowerCase().replace(/\s+/g, "-")}`
          return (
            <SidebarMenuItem key={section.name}>
              <SidebarMenuButton asChild>
                <Link href={href}>
                  {section.icon}
                  <span>{section.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        }
        return null
      })
      .filter((item) => item !== null)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }


  const collapsibleMode = isMobile ? "offcanvas" : "icon"

  return (
    <Sidebar 
      collapsible={collapsibleMode} 
      className={cn("h-[calc(100vh-4rem)] bg-background", className)}
      {...props}
    >
      <SidebarHeader className="relative">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary ${state === "collapsed" && !isMobile ? "opacity-0" : "opacity-100"}`}>
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span
            className={`text-lg font-semibold transition-opacity duration-300 ${state === "collapsed" && !isMobile ? "opacity-0" : "opacity-100"}`}
          >
            Management
          </span>
        </div>
        {!isMobile && (
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={toggleSidebar}>
            {state === "collapsed" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Main
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/">
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Management
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {loading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">Loading...</div>
                    </div>
                  ) : (
                    renderManagementMenuItems()
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}