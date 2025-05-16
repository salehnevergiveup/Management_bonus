"use client"
import { useState, useEffect, useRef } from "react"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import ProcessProgressDialog from "./process-progress-dialog"
import { Events } from "@constants/enums"
import { useLanguage } from "@app/contexts/LanguageContext"
import { t } from "@app/lib/i18n"

interface FloatingProcessButtonProps {
  position?: "left" | "right"
}

export default function FloatingProcessButton({ position = "right" }: FloatingProcessButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [processCount, setProcessCount] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const prevCountRef = useRef(0)
  const { lang, setLang } = useLanguage()

  // Fetch process count - using the correct endpoint
  const fetchProcessCount = async () => {
    try {
      setIsUpdating(true)
      const response = await fetch("/api/process-progress/count")
      if (response.ok) {
        const data = await response.json()
        prevCountRef.current = processCount
        setProcessCount(data.count || 0)
      }
    } catch (error) {
      console.error("Error fetching process count:", error)
    } finally {
      // Keep the animation visible briefly
      setTimeout(() => {
        setIsUpdating(false)
      }, 800)
    }
  }

  // Debug function to help track when fetches occur
  const logFetch = (reason: any) => {
    console.log(`Fetching process count: ${reason}`, new Date().toISOString())
    fetchProcessCount()
  }

  useEffect(() => {
    // Fetch initial count
    logFetch('initial load')
    
    // Setup event listener
    const eventSource = new EventSource('/api/events')
    
    // Event handler for process tracker events
    eventSource.addEventListener(Events.PROGRESS_TRACKER, (event) => {
      console.log("Progress tracker event received:", event)
      logFetch('progress tracker event')
    })
    
    // Listen for general progress updates
    eventSource.addEventListener('progress', (event) => {
      console.log("Progress event received:", event)
      logFetch('progress event')
    })
    
    // Clean up
    return () => {
      eventSource.close()
    }
  }, [])

  // Update count when dialog is opened
  useEffect(() => {
    if (dialogOpen) {
      logFetch('dialog opened')
    }
  }, [dialogOpen])

  // Determine if count has increased or decreased
  const countChanged = processCount !== prevCountRef.current
  const countIncreased = processCount > prevCountRef.current
  const countDecreased = processCount < prevCountRef.current

  return (
    <div className={cn("fixed z-50 bottom-8 flex items-center", position === "left" ? "left-8" : "right-8")}>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out flex items-center",
          isHovered ? "opacity-100 mr-3" : "opacity-0 mr-0 pointer-events-none",
          position === "left" && isHovered ? "ml-3" : "ml-0",
        )}
      >
        <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          {t("active_process_tracker",lang)}
        </div>
      </div>
      <ProcessProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trigger={
          <button
            className={cn(
              "h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all relative",
              isUpdating ? "animate-pulse" : ""
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => logFetch('button clicked')}
          >
            <Activity className="h-6 w-6" />
            {processCount > 0 && (
              <div 
                className={cn(
                  "absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                  isUpdating ? "animate-bounce" : "",
                  countIncreased && isUpdating ? "bg-green-500" : 
                  countDecreased && isUpdating ? "bg-yellow-500" : 
                  "bg-red-500"
                )}
              >
                <span className={isUpdating ? "animate-pulse" : ""}>
                  {processCount}
                </span>
              </div>
            )}
          </button>
        }
      />
    </div>
  )
}