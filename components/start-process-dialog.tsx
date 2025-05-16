"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from 'lucide-react'
import toast from "react-hot-toast"

interface AgentAccount {
  id: string
  username: string
}

interface StartProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentAccounts: AgentAccount[]
  onSuccess: () => void
}

export function StartProcessDialog({ open, onOpenChange, agentAccounts, onSuccess }: StartProcessDialogProps) {
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [processName, setProcessName] = useState("")
  const [dateErrors, setDateErrors] = useState<{ fromDate?: string; toDate?: string }>({})
  const [processNameError, setProcessNameError] = useState<string | null>(null)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const todayDate = new Date().toISOString().split("T")[0]

  const validateDateRange = () => {
    const errors: { fromDate?: string; toDate?: string } = {}

    // Create today date at the end of the day to include today itself
    const today = new Date()
    today.setHours(23, 59, 59, 999) // Set to end of today

    // Validate from date
    if (!fromDate) {
      errors.fromDate = "Start date is required"
    } else {
      const fromDateObj = new Date(fromDate)
      fromDateObj.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues

      const minDate = new Date("2020-01-01")

      if (fromDateObj < minDate) {
        errors.fromDate = "Start date cannot be before 2020"
      }

      // Compare with tomorrow instead of today to allow today's date
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (fromDateObj >= tomorrow) {
        errors.fromDate = "Start date cannot be in the future"
      }
    }

    // Validate to date
    if (!toDate) {
      errors.toDate = "End date is required"
    } else {
      const toDateObj = new Date(toDate)
      toDateObj.setHours(12, 0, 0, 0) // Set to noon to avoid timezone issues

      // Compare with tomorrow instead of today to allow today's date
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (toDateObj >= tomorrow) {
        errors.toDate = "End date cannot be in the future"
      }

      if (fromDate) {
        const fromDateObj = new Date(fromDate)
        fromDateObj.setHours(12, 0, 0, 0) // Set to noon

        if (toDateObj < fromDateObj) {
          errors.toDate = "End date must be after the start date"
        }

        // Check if date range is more than 3 months
        const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000 // Approximate 3 months in milliseconds
        if (toDateObj.getTime() - fromDateObj.getTime() > threeMonthsInMs) {
          errors.toDate = "Date range cannot exceed 3 months"
        }
      }
    }

    setDateErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateProcessName = () => {
    if (!processName || processName.trim() === "") {
      setProcessNameError("Process name is required")
      return false
    }
    
    setProcessNameError(null)
    return true
  }

  const handleSubmit = async () => {
    const isDateRangeValid = validateDateRange()
    const isProcessNameValid = validateProcessName()
    
    if (!isDateRangeValid || !isProcessNameValid) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/processes/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          process_name: processName.trim(),
          from_date: fromDate,
          to_date: toDate,
          agent_accounts: selectedAgents,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start process")
      }

      const result = await response.json()
      toast.success(result.message || "Process started successfully")
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error("Error starting process:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start process")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFromDate("")
    setToDate("")
    setProcessName("")
    setSelectedAgents([])
    setDateErrors({})
    setProcessNameError(null)
  }

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start New Process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Process Name Field */}
          <div className="space-y-2">
            <Label htmlFor="process_name">Process Name</Label>
            <Input
              id="process_name"
              placeholder="Enter a name for this process"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
            />
            {processNameError && (
              <p className="text-sm text-red-500">{processNameError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_date">From Date</Label>
            <div className="relative">
              <Input
                id="from_date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                min="2020-01-01"
                max={toDate || todayDate} // Restrict to either the to date or today, whichever is earlier
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {dateErrors.fromDate && (
              <p className="text-sm text-red-500">{dateErrors.fromDate}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="to_date">To Date</Label>
            <div className="relative">
              <Input
                id="to_date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || "2020-01-01"}
                max={todayDate} 
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {dateErrors.toDate && (
              <p className="text-sm text-red-500">{dateErrors.toDate}</p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground mt-2">
            <p>Note: Date range cannot exceed 3 months, must be after 2020, and cannot be in the future.</p>
          </div>
        </div>
        
        <div className="space-y-2 mt-4">
          <Label>Select Agent Accounts</Label>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="select_all"
              checked={selectedAgents.length === agentAccounts.length}
              onChange={(e) =>
                setSelectedAgents(e.target.checked ? agentAccounts.map((a) => a.username) : [])
              }
            />
            <Label htmlFor="select_all" className="text-sm">Select All</Label>
          </div>
          <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
            {agentAccounts.map((account) => (
              <div key={account.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={account.username}
                  checked={selectedAgents.includes(account.username)}
                  onChange={(e) => {
                    setSelectedAgents((prev) =>
                      e.target.checked
                        ? [...prev, account.username]
                        : prev.filter((u) => u !== account.username)
                    );
                  }}
                />
                <Label htmlFor={account.username} className="text-sm">{account.username}</Label>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Starting..." : "Start Process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
