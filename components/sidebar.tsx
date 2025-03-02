"use client"

"use client"

import type * as React from "react"
import {
  Users,
  UserCheck,
  BarChart3,
  Wallet,
  FileText,
  Home,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useUser } from "../hooks/getSession"
import { signOut } from "next-auth/react"

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

export default function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, loading } = useUser()
  const { state, toggleSidebar } = useSidebar()

  const renderManagementMenuItems = () => {
    const sections = [
      { name: "User", icon: <Users className="h-4 w-4" /> },
      { name: "Player", icon: <UserCheck className="h-4 w-4" /> },
      { name: "Bonus", icon: <BarChart3 className="h-4 w-4" /> },
      { name: "Processe", icon: <BarChart3 className="h-4 w-4" /> },
      { name: "Matched Player", icon: <UserCheck className="h-4 w-4" /> },
      { name: "Transfer Account", icon: <Wallet className="h-4 w-4" /> },
      { name: "Request", icon: <FileText className="h-4 w-4" /> },
    ]

    return sections
      .map((section) => {
        if (user && user.canAccess(section.name)) {
          const href = `/${section.name.toLowerCase().replace(/\s+/g, "-")}`
          return (
            <SidebarMenuItem key={section.name}>
              <SidebarMenuButton asChild>
                <a href={href}>
                  {section.icon}
                  <span>{section.name}</span>
                </a>
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

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="relative">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary  ${state === "collapsed" ? "opacity-0" : "opacity-100"}`}>
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span
            className={`text-lg font-semibold transition-opacity duration-300 ${state === "collapsed" ? "opacity-0" : "opacity-100"}`}
          >
            Management
          </span>
        </div>
        <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={toggleSidebar}>
          {state === "collapsed" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
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
                      <a href="/">
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </a>
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






          