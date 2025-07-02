"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/usercontext"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Calendar, Eye, AlertCircle, FileDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/badge"
import toast from "react-hot-toast"
import { ExportPreviewDialog } from "@/components/export-preview-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BatchExportDialog } from "@/components/batch-export-dialog"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface User {
  id: string
  name: string
  email: string
  profile_img?: string
}

interface Process {
  id: string
  process_name: string
  status: string
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  user_id: string
  user: User
  from_date?: string
  to_date?: string
  matchCount: number
  successMatchCount: number
}

interface DebugInfo {
  availableStatuses: string[]
  availableMatchStatuses: string[]
  totalWithoutFilter: number
  totalWithFilter: number
}

export default function HistoryDataPage() {
  const { auth, isLoading } = useUser()
  const [processes, setProcesses] = useState<Process[]>([])
  const [filteredProcesses, setFilteredProcesses] = useState<Process[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading2, setIsLoading2] = useState(false)
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [batchExportDialogOpen, setBatchExportDialogOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const router = useRouter()

  // Filter out statuses that are not "success" or "failed"
  const filterRelevantStatuses = (statuses: string[]) => {
    return statuses.filter((status) => {
      const lowerStatus = status.toLowerCase()
      return lowerStatus.includes("success") || lowerStatus.includes("complet") || lowerStatus.includes("fail")
    })
  }

  const fetchHistoricalProcesses = async () => {
    if (auth) {
      if (!auth.canAccess("processes")) {
        router.push("/dashboard")
        return
      }
    }

    setIsLoading2(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append("page", currentPage.toString())
      queryParams.append("limit", pageSize.toString())
      queryParams.append("status", statusFilter !== "all" ? statusFilter : "")
      queryParams.append("search", searchTerm)

      const response = await fetch(`/api/history/processes?${queryParams.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch historical processes")
      }

      const data = await response.json()
      if (data.success) {
        setProcesses(data.data)
        setFilteredProcesses(data.data)
        setTotalPages(data.pagination.totalPages)

        // Store debug info
        if (data.debug) {
          setDebugInfo(data.debug)
        }
      } else {
        console.error("API returned error:", data.error)
        toast.error("Failed to fetch historical processes")
      }
    } catch (error) {
      console.error("Error fetching historical processes:", error)
      toast.error("Failed to fetch historical processes")
    } finally {
      setIsLoading2(false)
    }
  }

  useEffect(() => {
    if (!isLoading && auth) {
      fetchHistoricalProcesses()
    }
  }, [isLoading, auth, currentPage, pageSize, statusFilter])

  // Filter processes based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProcesses(processes)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = processes.filter(
        (process) =>
          process.process_name?.toLowerCase().includes(term) ||
          process.id.toLowerCase().includes(term) ||
          process.user.name.toLowerCase().includes(term) ||
          process.user.email.toLowerCase().includes(term),
      )
      setFilteredProcesses(filtered)
    }
  }, [searchTerm, processes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchHistoricalProcesses()
  }

  const { lang, setLang } = useLanguage()

  const handleExportPreview = (process: Process) => {
    setSelectedProcess(process)
    setPreviewDialogOpen(true)
  }

  const handleBatchExport = () => {
    setBatchExportDialogOpen(true)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes("fail")) return "error"
    if (lowerStatus.includes("success") || lowerStatus.includes("complet")) return "success"
    return "info"
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Get relevant statuses for the dropdown
  const getStatusOptions = () => {
    if (!debugInfo?.availableStatuses || debugInfo.availableStatuses.length === 0) {
      return [
        { value: "all", label: "All Statuses" },
        { value: "success", label: "Success" },
        { value: "failed", label: "Failed" },
      ]
    }

    const relevantStatuses = filterRelevantStatuses(debugInfo.availableStatuses)

    return [
      { value: "all", label: "All Statuses" },
      ...relevantStatuses.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
      })),
    ]
  }

  const statusOptions = getStatusOptions()

  // Check if there are any processes with success matches
  const hasProcessesWithSuccessMatches = processes.some((process) => process.successMatchCount > 0)

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb items={[{ label: t("history_data", lang) }]} />

      {debugInfo && debugInfo.totalWithoutFilter > 0 && debugInfo.totalWithFilter === 0 && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("there_are", lang)} {debugInfo.totalWithoutFilter} {t("processes_in_database", lang)},{" "}
            {t("but_none_match", lang)}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => setShowDebug(!showDebug)}>
              {showDebug ? t("hide_debug_info", lang) : t("show_debug_info", lang)}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showDebug && debugInfo && (
        <div className="mb-4 p-4 bg-muted rounded-md text-sm">
          <h3 className="font-medium mb-2">{t("debug_information", lang)}</h3>
          <p>
            {t("available_status_values", lang)}: {debugInfo.availableStatuses.join(", ") || t("none", lang)}
          </p>
          <p>
            {t("available_match_status_values", lang)}: {debugInfo.availableMatchStatuses.join(", ") || t("none", lang)}
          </p>
          <p>
            {t("total_processes_no_filter", lang)}: {debugInfo.totalWithoutFilter}
          </p>
          <p>
            {t("total_processes_with_filter", lang)}: {debugInfo.totalWithFilter}
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-4">
            <CardTitle>{t("history_data_exploration", lang)}</CardTitle>
            <Button
              onClick={handleBatchExport}
              disabled={!hasProcessesWithSuccessMatches || isLoading2}
              className="ml-4"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t("export_all_processes", lang)}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("filter_by_status", lang)} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="10">{t("ten_rows", lang)}</SelectItem>
                <SelectItem value="20">{t("twenty_rows", lang)}</SelectItem>
                <SelectItem value="50">{t("fifty_rows", lang)}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("search_processes", lang)}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit">{t("search", lang)}</Button>
          </form>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("process_name", lang)}</TableHead>
                  <TableHead>{t("user", lang)}</TableHead>
                  <TableHead>{t("status", lang)}</TableHead>
                  <TableHead>{t("date_range", lang)}</TableHead>
                  <TableHead>{t("matches", lang)}</TableHead>
                  <TableHead>{t("created_at", lang)}</TableHead>
                  <TableHead>{t("last_updated", lang)}</TableHead>
                  <TableHead className="text-right">{t("actions", lang)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading2 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("loading_historical_processes", lang)}
                    </TableCell>
                  </TableRow>
                ) : filteredProcesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("no_historical_processes_found", lang)}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProcesses.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell className="font-medium">
                        {process.process_name || t("process_id", lang) + `-${process.id.substring(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={process.user?.profile_img || undefined} alt={process.user?.name} />
                            <AvatarFallback>{process.user?.name?.substring(0, 2).toUpperCase() || "UN"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div>{process.user?.name || t("unknown", lang)}</div>
                            <div className="text-sm text-muted-foreground">
                              {process.user?.email || t("no_email", lang)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge color={getStatusColor(process.status)} text={process.status} />
                      </TableCell>
                      <TableCell>
                        {process.from_date && process.to_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {new Date(process.from_date).toLocaleDateString()} -{" "}
                              {new Date(process.to_date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t("not_specified", lang)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {t("total", lang)}: {process.matchCount}
                          </span>
                          <span className="text-xs text-green-600">
                            {t("success", lang)}: {process.successMatchCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(process.created_at)}</TableCell>
                      <TableCell>{formatDate(process.updated_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportPreview(process)}
                            title={t("preview_and_export_data", lang)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t("preview", lang)}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
              <div className="text-sm text-muted-foreground">
                {t("showing", lang)}{" "}
                <span className="font-medium">
                  {filteredProcesses.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{" "}
                {t("to", lang)}{" "}
                <span className="font-medium">{Math.min(currentPage * pageSize, filteredProcesses.length)}</span>{" "}
                {t("of", lang)} <span className="font-medium">{filteredProcesses.length}</span> {t("processes", lang)}
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => goToPage(1)} disabled={currentPage === 1} size="sm">
                  {t("first", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  {t("previous", lang)}
                </Button>
                <span className="px-2">
                  {t("page", lang)} {currentPage} {t("of", lang)} {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  {t("next", lang)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  size="sm"
                >
                  {t("last", lang)}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Preview Dialog */}
      {selectedProcess && (
        <ExportPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          process={selectedProcess}
          onExportSuccess={fetchHistoricalProcesses}
        />
      )}

      {/* Batch Export Dialog */}
      <BatchExportDialog
        open={batchExportDialogOpen}
        onOpenChange={setBatchExportDialogOpen}
        processes={processes.filter((p) => p.successMatchCount > 0)}
        onExportSuccess={fetchHistoricalProcesses}
      />
    </div>
  )
}
