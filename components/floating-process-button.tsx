"use client"

import { useState } from "react"
import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import ProcessProgressDialog from "./process-progress-dialog"

interface FloatingProcessButtonProps {
  position?: "left" | "right"
}

export default function FloatingProcessButton({ position = "right" }: FloatingProcessButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  
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
          Active Process Tracker
        </div>
      </div>
      
      <ProcessProgressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trigger={
          <button
            className={cn(
              "h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Activity className="h-6 w-6" />
          </button>
        }
      />
    </div>
  )
}