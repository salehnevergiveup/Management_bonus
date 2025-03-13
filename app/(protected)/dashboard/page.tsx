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
import { User, Users, Clock, Bell, FileCheck, AlertTriangle, Layers, Fingerprint } from "lucide-react"
import { ProcessStatus, NotificationStatus } from "@/constants/enums"
import toast from 'react-hot-toast'
export default function DashboardPage() {
  const { auth, isLoading } = useUser()
  const router = useRouter()
  
  const [timeRange, setTimeRange] = useState("week")
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
      progress: number;
      start_time: string | Date;
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
        completed: data.processes?.filter(p => p.status === ProcessStatus.COMPLETED)?.length || 0,
        failed: data.processes?.filter(p => p.status === ProcessStatus.FAILED)?.length || 0
      },
      totalNotifications: {
        read: data.notifications?.filter(n => n.status === NotificationStatus.READ)?.length || 0,
        unread: data.notifications?.filter(n => n.status === NotificationStatus.UNREAD)?.length || 0
      }
    })
  }

  if (isLoading) {
    return <p>Loading session...</p>
  }

  // Notification status data for pie chart
  const notificationStatusData = [
    { name: 'Read', value: stats.totalNotifications.read || 0 },
    { name: 'Unread', value: stats.totalNotifications.unread || 0 }
  ].filter(item => item.value > 0);

  // Process status data for pie chart
  const processStatusData = [
    { name: 'Completed', value: stats.totalProcesses.completed || 0 },
    { name: 'Failed', value: stats.totalProcesses.failed || 0 }
  ].filter(item => item.value > 0);

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* User Profile Card */}
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4 pt-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={auth?.picture} alt={auth?.name} />
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
              <CardTitle>Dashboard Overview</CardTitle>
              <Select
                value={timeRange}
                onValueChange={(value) => setTimeRange(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="five_years">Last 5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardDescription>
              View system metrics for the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Users</span>
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Transfer Accounts</span>
                <span className="text-2xl font-bold">{stats.totalTransferAccounts}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Players</span>
                <span className="text-2xl font-bold">{stats.totalPlayers}</span>
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Processes</span>
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
            <CardTitle>User & Account Growth</CardTitle>
            <CardDescription>
              Tracking user and account metrics over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dashboardData.users.map((item, index) => ({
                  name: item.date || `Point ${index}`,
                  users: item.count || 0,
                  transferAccounts: dashboardData.transferAccounts[index]?.count || 0,
                  players: dashboardData.players[index]?.count || 0
                }))}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#8884d8" name="Users" />
                <Line type="monotone" dataKey="transferAccounts" stroke="#82ca9d" name="Transfer Accounts" />
                <Line type="monotone" dataKey="players" stroke="#ffc658" name="Players" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Process Status Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Process Status</CardTitle>
            <CardDescription>
              Distribution of completed vs failed processes
            </CardDescription>
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
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            <CardTitle>Notification Status</CardTitle>
            <CardDescription>
              Breakdown of read vs unread notifications
            </CardDescription>
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
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        {/* Active Processes */}
        <Card>
          <CardHeader>
            <CardTitle>Active Processes</CardTitle>
            <CardDescription>
              Current running processes and their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboardData.activeProcesses && dashboardData.activeProcesses.length > 0 ? (
                dashboardData.activeProcesses.map(process => (
                  <div key={process.id} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        Process ID: {process.id.substring(0, 8)}...
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(process.progress * 100)}%
                      </span>
                    </div>
                    <Progress value={process.progress * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Started: {new Date(process.start_time).toLocaleString()}</span>
                      <span>Status: {process.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-2" />
                  <p>No active processes</p>
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
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              User accounts in the system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transfer Accounts</CardTitle>
            <Fingerprint className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransferAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Total transfer accounts registered
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              Total players in the system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNotifications.read + stats.totalNotifications.unread}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <div className="mr-1 h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs">{stats.totalNotifications.read} Read</span>
              </div>
              <div className="flex items-center">
                <div className="mr-1 h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-xs">{stats.totalNotifications.unread} Unread</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}