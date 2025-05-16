"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertTriangle, Check, X, FileDown } from "lucide-react"
import toast from "react-hot-toast"
import { Badge } from "@/components/badge"
import { ConfirmationDialog } from "@/components/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
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

interface BatchExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  processes: Process[]
  onExportSuccess: () => void
}

export function BatchExportDialog({ open, onOpenChange, processes, onExportSuccess }: BatchExportDialogProps) {
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv")
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportedFilename, setExportedFilename] = useState("")
  const [exportProgress, setExportProgress] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const { lang, setLang } = useLanguage()

  useEffect(() => {
    if (open) {
      // Select all processes by default
      setSelectedProcesses(processes.map((p) => p.id))

      // Calculate total matches
      const total = processes.reduce((sum, process) => sum + process.successMatchCount, 0)
      setTotalMatches(total)
    } else {
      setSelectedProcesses([])
      setExportSuccess(false)
      setExportedFilename("")
      setExportProgress(0)
      setTotalMatches(0)
    }
  }, [open, processes])

  const toggleSelectAll = () => {
    if (selectedProcesses.length === processes.length) {
      setSelectedProcesses([])
    } else {
      setSelectedProcesses(processes.map((p) => p.id))
    }
  }

  const toggleProcessSelection = (processId: string) => {
    if (selectedProcesses.includes(processId)) {
      setSelectedProcesses(selectedProcesses.filter((id) => id !== processId))
    } else {
      setSelectedProcesses([...selectedProcesses, processId])
    }
  }

  const generateFilename = () => {
    const dateStr = new Date().toISOString().split("T")[0]
    const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-")
    return `batch-export-${dateStr}-${timeStr}.${exportFormat === "csv" ? "csv" : "xlsx"}`
  }

  const handleExport = async () => {
    if (selectedProcesses.length === 0) {
      toast.error("Please select at least one process to export")
      return
    }

    setIsExporting(true)
    setExportProgress(0)

    try {
      const filename = generateFilename()
      setExportedFilename(filename)

      console.log("Starting export with processIds:", selectedProcesses)
      console.log("Export format:", exportFormat)
      console.log("Filename:", filename)

      try {
        const response = await fetch(`/api/history/processes/batch-export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            processIds: selectedProcesses,
            format: exportFormat,
            filename,
          }),
        })

        console.log("Response status:", response.status)
        console.log("Response status text:", response.statusText)

        // Try to get more details from the response
        let responseText = ""
        try {
          responseText = await response.text()
          console.log("Response body:", responseText.substring(0, 500)) // Log first 500 chars to avoid huge logs
        } catch (textError) {
          console.error("Error reading response text:", textError)
        }

        if (!response.ok) {
          throw new Error(
            `Failed to export data: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ""}`,
          )
        }

        // For CSV/Excel, we need to download the file
        const blob = new Blob([responseText], {
          type: exportFormat === "csv" ? "text/csv" : "application/vnd.ms-excel",
        })

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast.success(`Data exported successfully as ${exportFormat.toUpperCase()}`)
        setExportSuccess(true)

        // After successful export, show the delete confirmation
        setConfirmDeleteOpen(true)
      } catch (fetchError) {
        console.error("Fetch error details:", fetchError)
        throw fetchError
      }
    } catch (error) {
      console.error("Error exporting data:", error)
    } finally {
      setIsExporting(false)
      setExportProgress(100) // Set to 100% when done
    }
  }

  const handleDelete = async () => {
    if (selectedProcesses.length === 0) return

    setIsDeleting(true)
    setExportProgress(0)

    try {
      let successCount = 0
      let failCount = 0

      // Delete processes one by one to show progress
      for (let i = 0; i < selectedProcesses.length; i++) {
        const processId = selectedProcesses[i]

        try {
          const response = await fetch(`/api/history/processes/${processId}`, {
            method: "DELETE",
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error(`Error deleting process ${processId}:`, error)
          failCount++
        }

        // Update progress
        setExportProgress(Math.round(((i + 1) / selectedProcesses.length) * 100))
      }

      if (failCount === 0) {
        toast.success(`Successfully deleted ${successCount} processes and their related data`)
      } else {
        toast.success(`Deleted ${successCount} processes successfully, but failed to delete ${failCount} processes`)
      }

      setConfirmDeleteOpen(false)
      onOpenChange(false)
      onExportSuccess() // Refresh the process list
    } catch (error) {
      console.error("Error deleting processes:", error)
      toast.error("Failed to delete processes")
    } finally {
      setIsDeleting(false)
      setExportProgress(100)
    }
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

  // Calculate total success matches in selected processes
  const selectedSuccessMatches = processes
    .filter((p) => selectedProcesses.includes(p.id))
    .reduce((sum, p) => sum + p.successMatchCount, 0)

    return (
        <>
          <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {exportSuccess ? t("batch_export_successful", lang) : t("export_all_processes", lang)}
                </DialogTitle>
              </DialogHeader>
    
              {exportSuccess ? (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center p-4 bg-green-50 rounded-md border border-green-200">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-green-800">{t("export_completed_successfully", lang)}</h3>
                      <p className="text-sm text-green-600 mt-1">
                        {t("your_data_exported_to", lang)}: <strong>{exportedFilename}</strong>
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {t("total_processes", lang)}: <strong>{selectedProcesses.length}</strong>,{" "}
                        {t("total_success_matches", lang)}: <strong>{selectedSuccessMatches}</strong>
                      </p>
                    </div>
                  </div>
    
                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">{t("delete_processes_question", lang)}</p>
                        <p className="text-sm text-amber-700 mt-1">{t("delete_processes_explanation", lang)}</p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDeleteOpen(true)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("deleting", lang)}...
                              </>
                            ) : (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                {t("delete_all_selected_processes", lang)}
                              </>
                            )}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                            {t("keep_processes", lang)}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
    
                  {isDeleting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("deleting_processes", lang)}...</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <Progress value={exportProgress} className="h-2" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-medium mb-1">{t("export_details", lang)}</h3>
                      <p className="text-sm">
                        {t("total_processes_available", lang)}: <strong>{processes.length}</strong>
                      </p>
                      <p className="text-sm">
                        {t("selected_processes", lang)}: <strong>{selectedProcesses.length}</strong>
                      </p>
                      <p className="text-sm">
                        {t("total_success_matches_to_export", lang)}: <strong>{selectedSuccessMatches}</strong>
                      </p>
                    </div>
    
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t("export_format", lang)}:</span>
                        <div className="flex border rounded-md overflow-hidden">
                          <Button
                            type="button"
                            variant={exportFormat === "csv" ? "default" : "outline"}
                            size="sm"
                            className="rounded-none border-0"
                            onClick={() => setExportFormat("csv")}
                          >
                            CSV
                          </Button>
                          <Button
                            type="button"
                            variant={exportFormat === "excel" ? "default" : "outline"}
                            size="sm"
                            className="rounded-none border-0"
                            onClick={() => setExportFormat("excel")}
                          >
                            Excel
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={handleExport}
                        disabled={isExporting || selectedProcesses.length === 0 || selectedSuccessMatches === 0}
                        className="w-full"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("exporting", lang)}...
                          </>
                        ) : (
                          <>
                            <FileDown className="mr-2 h-4 w-4" />
                            {t("export_selected_processes", lang)}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
    
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("exporting_data", lang)}...</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <Progress value={exportProgress} className="h-2" />
                    </div>
                  )}
    
                  <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">{t("important_note", lang)}</p>
                        <p className="text-sm text-amber-700">{t("after_exporting_note", lang)}</p>
                      </div>
                    </div>
                  </div>
    
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedProcesses.length === processes.length && processes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t("select_all_processes", lang)}
                    </label>
                  </div>
    
                  <div className="rounded-md border overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">{t("select", lang)}</TableHead>
                            <TableHead>{t("process_name", lang)}</TableHead>
                            <TableHead>{t("status", lang)}</TableHead>
                            <TableHead>{t("success_matches", lang)}</TableHead>
                            <TableHead>{t("created_at", lang)}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                {t("no_processes_found", lang)}
                              </TableCell>
                            </TableRow>
                          ) : (
                            processes.map((process) => (
                              <TableRow key={process.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedProcesses.includes(process.id)}
                                    onCheckedChange={() => toggleProcessSelection(process.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {process.process_name || `${t("process", lang)}-${process.id.substring(0, 8)}`}
                                </TableCell>
                                <TableCell>
                                  <Badge color={getStatusColor(process.status)} text={process.status} />
                                </TableCell>
                                <TableCell>{process.successMatchCount}</TableCell>
                                <TableCell>{formatDate(process.created_at)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
    
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("close", lang)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
    
          {/* Confirmation Dialog for Delete */}
          <ConfirmationDialog
            isOpen={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            onConfirm={() => handleDelete()}
            title={t("delete_all_selected_processes", lang)}
            children={
              <div className="space-y-3">
                <p>
                  {t("data_exported_successfully_delete_confirmation", lang)} {selectedProcesses.length}{" "}
                  {t("selected_processes_and_related_data", lang)}
                </p>
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>{t("warning", lang)}:</strong> {t("delete_warning_message", lang)}
                  </p>
                </div>
              </div>
            }
            confirmText={isDeleting ? t("deleting", lang) + "..." : t("delete_all_selected_processes", lang)}
            confirmVariant="destructive"
            isLoading={isDeleting}
          />
        </>
      )
}
