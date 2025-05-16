"use client"

import { useState, useEffect } from "react"
import { Eye, Trash2, MoreHorizontal, Search } from "lucide-react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/usercontext"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ConfirmationDialog } from "@/components/dialog"
import toast from 'react-hot-toast';
import {Notification} from  "@/types/notification.types"
import  {AppColor,NotificationType, NotificationStatus} from  "@/constants/enums"
import {PaginationData} from  "@/types/pagination-data.type"
import   {GetResponse} from "@/types/get-response.type" 
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"
interface SelectedNotification {
  id: string
  user_id: string,
  userName: string,
  userEmail:string,
  userRole: string,
  userStatus: string,
  message: string,
  status: string,
  type: string,
  createdAt: Date,
}

export default function NotificationsPage() {
  const { auth, isLoading } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null)
  const router = useRouter()
  const { lang, setLang } = useLanguage()

  const fetchNotifications = async () => {
    if (auth) {
      if (!auth.canAccess("notifications")) {
        router.push("/dashboard");
        return; 
      } 
    }
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      queryParams.append("page", currentPage.toString())
      queryParams.append("limit", pageSize.toString())

      if (typeFilter && typeFilter !== "all") {
        queryParams.append("type", typeFilter)
      }

      if (statusFilter && statusFilter !== "all") {
        queryParams.append("status", statusFilter)
      }

      if (searchTerm) {
        queryParams.append("search", searchTerm)
      }
      const response = await fetch(`/api/notifications?${queryParams}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const result: GetResponse = await response.json()
      setNotifications(result.data)
      setPagination(result.pagination)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast.error("Failed to fetch notifications")
    } finally {
     
    }
  }

  useEffect(() => {
    if (!isLoading && auth) {
      if (!auth.canAccess("notifications")) {
        router.push("/dashboard")
      } else {
        fetchNotifications()
      }
    }
  }, [isLoading, auth, router, currentPage, typeFilter, statusFilter, pageSize])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== "") {
        fetchNotifications()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  if (isLoading) {
    return <p>{t("loading_session", lang)}</p>
  }

  const deleteNotification = async () => {
    if (!notificationToDelete) return

    try {
      const response = await fetch(`/api/notifications/${notificationToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete notification")
      }
      
      // Update local state to avoid full page refresh
      setNotifications(notifications.filter(n => n.id !== notificationToDelete.id))
      
      toast.success("Notification deleted successfully")
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
    } finally {
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
    }
  }

  const handleView = (notification: SelectedNotification) => {

    setSelectedNotification(notification)
    setViewDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

 

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("notifications", lang) }]} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t("notification_management", lang)}</CardTitle>
          <div className="flex items-center space-x-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={t("rows_per_page", lang)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">{t("five_rows", lang)}</SelectItem>
                <SelectItem value="10">{t("ten_rows", lang)}</SelectItem>
                <SelectItem value="20">{t("twenty_rows", lang)}</SelectItem>
                <SelectItem value="50">{t("fifty_rows", lang)}</SelectItem>
                <SelectItem value="100">{t("hundred_rows", lang)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("search_notifications", lang)}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (e.target.value === "") {
                    // Reset to first page and fetch without search term
                    setCurrentPage(1)
                    fetchNotifications()
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setCurrentPage(1)
                    fetchNotifications()
                  }
                }}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("filter_by_type", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_types", lang)}</SelectItem>
                  <SelectItem value="info">{t("info", lang)}</SelectItem>
                  <SelectItem value="warning">{t("warning", lang)}</SelectItem>
                  <SelectItem value="success">{t("success", lang)}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("filter_by_status", lang)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_statuses", lang)}</SelectItem>
                  <SelectItem value={NotificationStatus.READ}>{t("read", lang)}</SelectItem>
                  <SelectItem value={NotificationStatus.UNREAD}>{t("unread", lang)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("user", lang)}</TableHead>
                  <TableHead>{t("message", lang)}</TableHead>
                  <TableHead>{t("type", lang)}</TableHead>
                  <TableHead>{t("status", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("loading_notifications", lang)}
                    </TableCell>
                  </TableRow>
                ) : notifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t("no_notifications_found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  notifications.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={n.user?.profile_img || undefined} alt={n.user?.name} />
                            <AvatarFallback>{n.user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div>{n.user?.name}</div>
                            <div className="text-sm text-muted-foreground">{n.user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{n.message}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            n.type === NotificationType.INFO
                              ? AppColor.INFO
                              : n.type === NotificationType.WARNING
                                ? AppColor.WARNING
                                : n.type === NotificationType.ERROR? 
                                 AppColor.ERROR
                                 : AppColor.SUCCESS
                          }`}
                        >
                          {n.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            n.status ===  NotificationStatus.UNREAD ? AppColor.ERROR : AppColor.INFO
                          }`}
                        >
                          {n.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(new Date(n?.createdAt).toDateString())}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("open_menu", lang)}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleView({
                                ...n, 
                                userName: n.user?.name || t("unknown", lang),
                                userEmail: n.user?.email || t("no_email", lang),
                                userRole: n.user?.role.name || t("unknown", lang),
                                userStatus: n.user?.status || t("unknown", lang),
                              })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("view", lang)}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setNotificationToDelete(n)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("delete", lang)}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {t("showing", lang)} <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> {t("to", lang)}{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{" "}
                {t("of", lang)} <span className="font-medium">{pagination.total}</span> {t("notifications", lang)}
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    {t("first", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={isLoading || !pagination.hasPreviousPage}
                    size="sm"
                  >
                    {t("previous", lang)}
                  </Button>
                  <span className="px-2">
                    {t("page", lang)} {pagination.page} {t("of", lang)} {pagination.totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    {t("next", lang)}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => goToPage(pagination.totalPages)} 
                    disabled={isLoading || !pagination.hasNextPage}
                    size="sm"
                  >
                    {t("last", lang)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={deleteNotification}
        title={t("confirm_delete", lang)}
        children={t("confirm_delete_notification_message", lang)}
        confirmText={t("delete", lang)}
      />
<ConfirmationDialog
  isOpen={viewDialogOpen}
  onClose={() => setViewDialogOpen(false)}
  onConfirm={() => setViewDialogOpen(false)}
  title={t("notification_details", lang)}
  confirmText={t("close", lang)}
  showCancelButton={false}
>
  {selectedNotification && (
    <div className="space-y-2">
      <div className="flex items-center">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            selectedNotification.type === "info"
              ? "bg-blue-100 text-blue-800"
              : selectedNotification.type === "warning"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
          }`}
        >
          {selectedNotification.type}
        </span>
      </div>
      <p className="font-medium">{selectedNotification.message}</p>
     
        <p className="text-sm text-muted-foreground">
          {t("sent_to", lang)}: {selectedNotification.userName || t("unknown", lang)} 
          ({selectedNotification.userEmail || t("no_email", lang)})
        </p>
      <p className="text-sm text-muted-foreground">
        {t("sent_at", lang)}: {formatDate(new Date(selectedNotification.createdAt).toDateString())}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("status", lang)}: {selectedNotification.status}
      </p>
   
          <p className="text-sm text-muted-foreground">
            {t("user_role", lang)}: {selectedNotification?.userRole || t("unknown", lang)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("user_status", lang)}: {selectedNotification.userStatus || t("unknown", lang)}
          </p>


    </div>
  )}
</ConfirmationDialog>
    </div>
  )
}