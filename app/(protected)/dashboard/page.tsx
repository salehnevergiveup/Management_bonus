"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/contexts/usercontext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumb } from "@/components/breadcrumb"
import { Progress } from "@/components/ui/progress"
import { User, Users, Clock, Bell, FileCheck, AlertTriangle, Layers, Fingerprint, ChevronDown, ChevronUp } from "lucide-react"
import { ProcessStatus, NotificationStatus } from "@/constants/enums"
import { Badge } from "@/components/badge" 
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import toast from 'react-hot-toast'
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

export default function DashboardPage() {
  const { auth, isLoading } = useUser()
  const router = useRouter()
  
  const [timeRange, setTimeRange] = useState("week")
  
  // Updated interface to include transfer accounts and agent accounts
  interface TransferAccountInfo {
    id: string;
    username: string;
    status: string;
    progress: number | null;
    type: string;
    updated_at: string | Date;
  }

  interface AgentAccountInfo {
    id: string;
    username: string;
    status: string;
    progress: number | null;
    updated_at: string | Date;
  }

  interface DashboardData {
    users: Array<{ date: string; count: number }>;
    transferAccounts: Array<{ date: string; count: number }>;
    players: Array<{ date: string; count: number }>;
    processes: Array<{ id: string; status: string; created_at: string | Date }>;
    notifications: Array<{ id: string; status: string; createdAt: string | Date }>;
    activeProcesses: Array<{
      id: string;
      user_id: string;
      status: string;
      created_at: string | Date;
      progress: number;
      transferAccounts: TransferAccountInfo[];
      agent_account: AgentAccountInfo[];
    }>;
  }

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    users: [],
    transferAccounts: [],
    players: [],
    processes: [],
    notifications: [],
    activeProcesses: []
  })
  const [loading, setLoading] = useState(true)

  // Statistics calculated from dashboardData
  interface Stats {
    totalUsers: number;
    totalTransferAccounts: number;
    totalPlayers: number;
    totalProcesses: {
      completed: number;
      failed: number;
    };
    totalNotifications: {
      read: number;
      unread: number;
    };
  }

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransferAccounts: 0,
    totalPlayers: 0,
    totalProcesses: {
      completed: 0,
      failed: 0
    },
    totalNotifications: {
      read: 0,
      unread: 0
    }
  })

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  useEffect(() => {
    if (!isLoading && auth) {
      fetchDashboardData(timeRange)
    }
  }, [isLoading, auth, router, timeRange])

  const fetchDashboardData = async (range: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard?timeRange=${range}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const result = await response.json()
      
      if (result.data) {
        setDashboardData(result.data)
        // Calculate statistics
        calculateStats(result.data)
      } else {
        console.error("No data received from dashboard API")
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error("Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data: DashboardData) => {
    if (!data) {
      console.error("No data provided to calculateStats")
      return
    }
    
    setStats({
      totalUsers: data.users?.length > 0 ? data.users.reduce((sum, item) => sum + (item.count || 0), 0) : 0,
      totalTransferAccounts: data.transferAccounts?.length > 0 ? data.transferAccounts.reduce((sum, item) => sum + (item.count || 0), 0) : 0,
      totalPlayers: data.players?.length > 0 ? data.players.reduce((sum, item) => sum + (item.count || 0), 0) : 0,
      totalProcesses: {
        completed: data.processes?.filter(p => p.status === ProcessStatus.SUCCESS)?.length || 0,
        failed: data.processes?.filter(p => p.status === ProcessStatus.FAILED)?.length || 0
      },
      totalNotifications: {
        read: data.notifications?.filter(n => n.status === NotificationStatus.READ)?.length || 0,
        unread: data.notifications?.filter(n => n.status === NotificationStatus.UNREAD)?.length || 0
      }
    })
  }

  // Format the status for display
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  const { lang, setLang } = useLanguage()
  // Get appropriate color class based on status for the custom Badge component
  const getStatusColorClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  if (isLoading) {
    return <p>{t("dashboard_overview", lang)}</p>
  }

  // Notification status data for pie chart
  const notificationStatusData = [
    { name: t("read", lang), value: stats.totalNotifications.read || 0 },
    { name: t("unread", lang), value: stats.totalNotifications.unread || 0 }
  ].filter(item => item.value > 0);

  // Process status data for pie chart
  const processStatusData = [
    { name:  t("completed", lang), value: stats.totalProcesses.completed || 0 },
    { name:  t("failed", lang), value: stats.totalProcesses.failed || 0 }
  ].filter(item => item.value > 0);



  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("dashboard", lang) }]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* User Profile Card */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("profile", lang)}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4 pt-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={auth?.picture || "/placeholder.svg"} alt={auth?.name} />
                <AvatarFallback>{auth?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-bold">{auth?.name}</h3>
                <p className="text-sm text-muted-foreground">{auth?.email}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {auth?.role}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time period selector and summary */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t("dashboard_overview", lang)}</CardTitle>
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("select_time_range", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t("last_week", lang)}</SelectItem>
                  <SelectItem value="month">{t("last_month", lang)}</SelectItem>
                  <SelectItem value="year">{t("last_year", lang)}</SelectItem>
                  <SelectItem value="five_years">{t("last_5_years", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>{t("view_system_metrics", lang)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{t("users", lang)}</span>
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{t("transfer_accounts", lang)}</span>
                <span className="text-2xl font-bold">{stats.totalTransferAccounts}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{t("players", lang)}</span>
                <span className="text-2xl font-bold">{stats.totalPlayers}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">{t("processes", lang)}</span>
                <span className="text-2xl font-bold">
                  {stats.totalProcesses.completed + stats.totalProcesses.failed}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Users and Transfer Accounts */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>{t("user_account_growth", lang)}</CardTitle>
            <CardDescription>{t("tracking_metrics", lang)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dashboardData.users.map((item, index) => ({
                  name: item.date || `${t("point", lang)} ${index}`,
                  users: item.count || 0,
                  transferAccounts: dashboardData.transferAccounts[index]?.count || 0,
                  players: dashboardData.players[index]?.count || 0,
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#8884d8" name={t("users", lang)} />
                <Line type="monotone" dataKey="transferAccounts" stroke="#82ca9d" name={t("transfer_accounts", lang)} />
                <Line type="monotone" dataKey="players" stroke="#ffc658" name={t("players", lang)} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Process Status Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("process_status", lang)}</CardTitle>
            <CardDescription>{t("distribution_processes", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={processStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {processStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Notification Status */}
        <Card>
          <CardHeader>
            <CardTitle>{t("notification_status", lang)}</CardTitle>
            <CardDescription>{t("breakdown_notifications", lang)}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={notificationStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {notificationStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* UPDATED: Active Processes with Scrollable Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>{t("active_processes", lang)}</CardTitle>
            <CardDescription>{t("current_processes", lang)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.activeProcesses && dashboardData.activeProcesses.length > 0 ? (
                dashboardData.activeProcesses.map((process) => (
                  <Accordion key={process.id} type="single" collapsible className="border rounded-md">
                    <AccordionItem value={process.id}>
                      <AccordionTrigger className="px-4 py-2 hover:no-underline">
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-sm">
                              {t("process_id", lang)}: {process.id.substring(0, 8)}...
                            </span>
                            <Badge color={getStatusColorClass(process.status)} text={formatStatus(process.status)} />
                          </div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-muted-foreground">
                              {t("started", lang)}: {formatDate(process.created_at)}
                            </span>
                            <span className="text-xs font-medium">{Math.round(process.progress)}%</span>
                          </div>
                          <Progress value={process.progress} className="h-2" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4">
                        <Tabs defaultValue="transfer">
                          <TabsList className="mb-2">
                            <TabsTrigger value="transfer">
                              {t("transfer_accounts", lang)} ({process.transferAccounts?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="agent">
                              {t("agent_accounts", lang)} ({process.agent_account?.length || 0})
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="transfer" className="mt-0">
                            <ScrollArea className="h-40 rounded-md border p-2">
                              <div className="space-y-3">
                                {process.transferAccounts && process.transferAccounts.length > 0 ? (
                                  process.transferAccounts.map((account) => (
                                    <div key={account.id} className="p-2 border rounded-md">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-sm">{account.username}</span>
                                        <Badge
                                          color={getStatusColorClass(account.status)}
                                          text={formatStatus(account.status)}
                                        />
                                      </div>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-muted-foreground">
                                          {t("type", lang)}: {account.type}
                                        </span>
                                        <span className="text-xs font-medium">
                                          {account.progress !== null
                                            ? `${account.progress}%`
                                            : t("not_available", lang)}
                                        </span>
                                      </div>
                                      {account.progress !== null && (
                                        <Progress value={account.progress} className="h-1.5" />
                                      )}
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {t("updated", lang)}: {formatDate(account.updated_at)}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                    <p>{t("no_transfer_accounts", lang)}</p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </TabsContent>

                          <TabsContent value="agent" className="mt-0">
                            <ScrollArea className="h-40 rounded-md border p-2">
                              <div className="space-y-3">
                                {process.agent_account && process.agent_account.length > 0 ? (
                                  process.agent_account.map((account) => (
                                    <div key={account.id} className="p-2 border rounded-md">
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-sm">{account.username}</span>
                                        <Badge
                                          color={getStatusColorClass(account.status)}
                                          text={formatStatus(account.status)}
                                        />
                                      </div>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-muted-foreground">
                                          {t("agent_account", lang)}
                                        </span>
                                        <span className="text-xs font-medium">
                                          {account.progress !== null
                                            ? `${account.progress}%`
                                            : t("not_available", lang)}
                                        </span>
                                      </div>
                                      {account.progress !== null && (
                                        <Progress value={account.progress} className="h-1.5" />
                                      )}
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {t("updated", lang)}: {formatDate(account.updated_at)}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                    <p>{t("no_agent_accounts", lang)}</p>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </TabsContent>
                        </Tabs>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2" />
                  <p>{t("no_active_processes", lang)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("total_users", lang)}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{t("user_accounts_system", lang)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("transfer_accounts", lang)}</CardTitle>
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransferAccounts}</div>
            <p className="text-xs text-muted-foreground">{t("total_transfer_accounts", lang)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("players", lang)}</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">{t("total_players_system", lang)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("notifications", lang)}</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications.read + stats.totalNotifications.unread}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <div className="mr-1 h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs">
                  {stats.totalNotifications.read} {t("read", lang)}
                </span>
              </div>
              <div className="flex items-center">
                <div className="mr-1 h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-xs">
                  {stats.totalNotifications.unread} {t("unread", lang)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}