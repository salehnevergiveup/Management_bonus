"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertTriangle, FileSpreadsheet, Check, X } from "lucide-react"
import toast from "react-hot-toast"
import { Badge } from "@/components/badge"
import { ConfirmationDialog } from "@/components/dialog"
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

interface TransferAccount {
  id: string
  username: string
}

interface Match {
  id: string
  username: string
  game?: string
  status: string
  amount: number
  currency: string
  created_at: string
  updated_at?: string
  transfer_account?: TransferAccount
}

interface ExportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  process: Process
  onExportSuccess: () => void
}

export function ExportPreviewDialog({ open, onOpenChange, process, onExportSuccess }: ExportPreviewDialogProps) {
    const { lang } = useLanguage()
    const [matches, setMatches] = useState<Match[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv")
    const [exportSuccess, setExportSuccess] = useState(false)
    const [exportedFilename, setExportedFilename] = useState("")
  
    useEffect(() => {
      if (open && process) {
        fetchProcessMatches()
      } else {
        setMatches([])
        setExportSuccess(false)
        setExportedFilename("")
      }
    }, [open, process])
  
    const fetchProcessMatches = async () => {
      if (!process) return
  
      setIsLoading(true)
      try {
        const response = await fetch(`/api/history/processes/${process.id}/matches?status=success`)
  
        if (!response.ok) {
          throw new Error(t("failed_fetch_process_matches", lang))
        }
  
        const data = await response.json()
        setMatches(data.matches || [])
      } catch (error) {
        console.error(t("error_fetching_process_matches", lang), error)
        toast.error(t("failed_load_process_matches", lang))
      } finally {
        setIsLoading(false)
      }
    }
  
    const generateFilename = () => {
      const processName = process?.process_name || `${t("process", lang)}-${process?.id.substring(0, 8)}`
      const dateStr = new Date().toISOString().split("T")[0]
      const timeStr = new Date().toTimeString().split(" ")[0].replace(/:/g, "-")
      return `${processName}-${t("export", lang)}-${dateStr}-${timeStr}.${exportFormat === "csv" ? "csv" : "xlsx"}`
    }
  
    const handleExport = async () => {
      if (!process || matches.length === 0) return
  
      setIsExporting(true)
      try {
        const filename = generateFilename()
        setExportedFilename(filename)
  
        const response = await fetch(`/api/history/processes/${process.id}/export`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            format: exportFormat,
            filename,
          }),
        })
  
        if (!response.ok) {
          throw new Error(t("failed_export_data", lang))
        }
  
        // For CSV/Excel, we need to download the file
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
  
        toast.success(`${t("data_exported_successfully", lang)} ${exportFormat.toUpperCase()}`)
        setExportSuccess(true)
  
        // After successful export, show the delete confirmation
        setConfirmDeleteOpen(true)
      } catch (error) {
        console.error(t("error_exporting_data", lang), error)
        toast.error(t("failed_export_data", lang))
      } finally {
        setIsExporting(false)
      }
    }
  
    const handleDelete = async () => {
      if (!process) return
  
      setIsDeleting(true)
      try {
        const response = await fetch(`/api/history/processes/${process.id}`, {
          method: "DELETE",
        })
  
        if (!response.ok) {
          throw new Error(t("failed_delete_process", lang))
        }
  
        toast.success(t("process_deleted_successfully", lang))
        setConfirmDeleteOpen(false)
        onOpenChange(false)
        onExportSuccess() // Refresh the process list
      } catch (error) {
        console.error(t("error_deleting_process", lang), error)
        toast.error(t("failed_delete_process", lang))
      } finally {
        setIsDeleting(false)
      }
    }
  
    const formatDate = (dateString?: string) => {
      if (!dateString) return t("not_available", lang)
      return new Date(dateString).toLocaleString()
    }
  
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
      }).format(amount)
    }
  
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {exportSuccess
                  ? t("export_successful", lang)
                  : `${t("export_preview", lang)}: ${process?.process_name || `${t("process", lang)}-${process?.id.substring(0, 8)}`}`}
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
                      {t("data_exported_to", lang)}: <strong>{exportedFilename}</strong>
                    </p>
                  </div>
                </div>
  
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{t("delete_process_question", lang)}</p>
                      <p className="text-sm text-amber-700 mt-1">{t("delete_process_explanation", lang)}</p>
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
                              {t("deleting", lang)}
                            </>
                          ) : (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              {t("delete_process", lang)}
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                          {t("keep_process", lang)}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">{t("process_details", lang)}</h3>
                    <p className="text-sm">
                      {t("status", lang)}:{" "}
                      <Badge
                        color={process?.status.toLowerCase().includes("fail") ? "error" : "success"}
                        text={process?.status || ""}
                      />
                    </p>
                    <p className="text-sm">
                      {t("date_range", lang)}:{" "}
                      {process?.from_date && process?.to_date
                        ? `${new Date(process.from_date).toLocaleDateString()} - ${new Date(
                            process.to_date,
                          ).toLocaleDateString()}`
                        : t("not_specified", lang)}
                    </p>
                    <p className="text-sm">
                      {t("created_by", lang)}: {process?.user?.name || t("unknown", lang)}
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
                          {t("excel", lang)}
                        </Button>
                      </div>
                    </div>
                    <Button onClick={handleExport} disabled={isExporting || matches.length === 0} className="w-full">
                      {isExporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("exporting", lang)}
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          {t("export_as", lang)} {exportFormat.toUpperCase()}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
  
                <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">{t("important_note", lang)}</p>
                      <p className="text-sm text-amber-700">{t("after_exporting_note", lang)}</p>
                    </div>
                  </div>
                </div>
  
                <h3 className="text-sm font-medium mb-2">
                  {t("successful_matches_preview", lang)} ({matches.length} {t("matches", lang)})
                </h3>
  
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">{t("loading_matches", lang)}</span>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="text-center py-8 border rounded-md">
                    <p className="text-muted-foreground">{t("no_successful_matches", lang)}</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("username", lang)}</TableHead>
                            <TableHead>{t("game", lang)}</TableHead>
                            <TableHead>{t("transfer_account", lang)}</TableHead>
                            <TableHead>{t("amount", lang)}</TableHead>
                            <TableHead>{t("created_at", lang)}</TableHead>
                            <TableHead>{t("updated_at", lang)}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matches.map((match) => (
                            <TableRow key={match.id}>
                              <TableCell className="font-medium">{match.username}</TableCell>
                              <TableCell>{match.game || t("not_available", lang)}</TableCell>
                              <TableCell>{match.transfer_account?.username || t("not_available", lang)}</TableCell>
                              <TableCell>{formatCurrency(match.amount, match.currency)}</TableCell>
                              <TableCell>{formatDate(match.created_at)}</TableCell>
                              <TableCell>{formatDate(match.updated_at)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
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
          title={t("delete_process_data", lang)}
          children={
            <div className="space-y-3">
              <p>{t("data_exported_delete_confirmation", lang)}</p>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>{t("warning", lang)}:</strong> {t("delete_warning", lang)}
                </p>
              </div>
            </div>
          }
          confirmText={isDeleting ? t("deleting", lang) : t("delete_process_data", lang)}
          confirmVariant="destructive"
          isLoading={isDeleting}
        />
      </>
    )
  }
  