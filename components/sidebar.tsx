"use client"
import type * as React from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Target,
  BarChart3,
  Wallet,
  FileText,
  Users,
  CircleDollarSign,
  Bell,
  Key,
  Home,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Repeat2,
  UserCog,
  History,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useUser } from "@/contexts/usercontext"
import { useIsMobile } from "@/hooks/use-mobile"
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const { auth, isLoading } = useUser()
  const { state, toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  const checkAccess = (permissionName: string) => {
    if (!auth) return false
    return auth.canAccess(permissionName.toLowerCase().replace(/\s+/g, "-"))
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" })
  }

  const collapsibleMode = isMobile ? "offcanvas" : "icon"
  const { lang, setLang } = useLanguage();

  return (
    <Sidebar
      collapsible={collapsibleMode}
      className={cn("h-[calc(100vh-4rem)] bg-background overflow-x-hidden", className)}
      {...props}
    >
      <SidebarHeader className="relative">
        <div className="flex items-center gap-2 px-3 py-1">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md bg-primary ${
              state === "collapsed" && !isMobile ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="text-sm font-bold text-primary-foreground">M</span>
          </div>
          <span
            className={`text-sm font-semibold transition-opacity duration-300 ${
              state === "collapsed" && !isMobile ? "opacity-0" : "opacity-100"
            }`}
          >
            {t("management", lang)}
          </span>
        </div>
        {!isMobile && (
          <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={toggleSidebar}>
            {state === "collapsed" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto overflow-x-hidden">
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-xs">{t("dashboard", lang)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Account Management Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t("account_management", lang)}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">{t("loading", lang)}...</div>
                    </div>
                  ) : (
                    <>
                      {checkAccess("users") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/users">
                              <Users className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("users", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("agent-accounts") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/agent-accounts">
                              <UserCog className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("agent_account", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("transfer-accounts") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/transfer-accounts">
                              <Wallet className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("transfer_account", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator />

        {/* General Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t("general", lang)}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">{t("loading", lang)}...</div>
                    </div>
                  ) : (
                    <>
                      {checkAccess("requests") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/requests">
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("requests", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("api-keys") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/api-keys">
                              <Key className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("api_key", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("notifications") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/notifications">
                              <Bell className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("notification", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator />

        {/* Player and Bonus Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t("player_and_bonus", lang)}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">{t("loading", lang)}...</div>
                    </div>
                  ) : (
                    <>
                      {checkAccess("players") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/players">
                              <Gamepad2 className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("players", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("bonuses") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/bonuses">
                              <CircleDollarSign className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("bonus", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator />

        {/* Process Management Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t("process_management", lang)}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">{t("loading", lang)}...</div>
                    </div>
                  ) : (
                    <>
                      {checkAccess("processes") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/processes">
                              <div className="flex items-center gap-2 w-full overflow-hidden">
                                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  1
                                </div>
                                <BarChart3 className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate text-xs">{t("process", lang)}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("account-turnovers") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/account-turnovers">
                              <div className="flex items-center gap-2 w-full overflow-hidden">
                                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  2
                                </div>
                                <Repeat2 className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate text-xs">{t("account_turnover", lang)}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                      {checkAccess("matches") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/matches">
                              <div className="flex items-center gap-2 w-full overflow-hidden">
                                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                  3
                                </div>
                                <Target className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate text-xs">{t("matches", lang)}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator />

        {/* History Data Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                {t("history_data", lang)}
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {isLoading ? (
                    <div className="flex h-16 items-center justify-center">
                      <div className="spinner">{t("loading", lang)}...</div>
                    </div>
                  ) : (
                    <>
                      {checkAccess("processes") && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/history">
                              <History className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-xs">{t("data_exploration", lang)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full flex flex-col gap-2 p-2">
          {/* Language Switcher */}
          <Select value={lang} onValueChange={(val) => setLang(val as "eng" | "ch")}>
            <SelectTrigger className="w-full h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eng">{t("english", lang)}</SelectItem>
              <SelectItem value="ch">{t("chinese", lang)}</SelectItem>
            </SelectContent>
          </Select>

          {/* Logout */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
                <span>{t("logout", lang)}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}