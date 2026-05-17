"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type LockerStatus = "idle" | "scanning" | "verifying" | "granted" | "denied"

interface LockerAnimationProps {
  status: LockerStatus
}

export function LockerAnimation({ status }: LockerAnimationProps) {
  const [doorOpen, setDoorOpen] = useState(false)

  useEffect(() => {
    if (status === "granted") {
      setDoorOpen(true)
      const timer = setTimeout(() => setDoorOpen(false), 3000)
      return () => clearTimeout(timer)
    } else {
      setDoorOpen(false)
    }
  }, [status])

  const getStatusColor = () => {
    switch (status) {
      case "scanning":
        return "text-primary"
      case "verifying":
        return "text-amber-500"
      case "granted":
        return "text-accent"
      case "denied":
        return "text-destructive"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Locker Body */}
      <div
        className={cn(
          "relative h-48 w-36 rounded-lg border-4 bg-gradient-to-b from-secondary to-muted shadow-xl transition-all duration-500",
          status === "scanning" && "border-primary animate-pulse",
          status === "verifying" && "border-amber-500",
          status === "granted" && "border-accent",
          status === "denied" && "border-destructive animate-shake",
          status === "idle" && "border-muted-foreground/50"
        )}
      >
        {/* Locker Door */}
        <div
          className={cn(
            "absolute inset-1 origin-left rounded-md border-2 bg-gradient-to-br from-card to-secondary shadow-inner transition-all duration-700 ease-in-out",
            doorOpen
              ? "rotate-y-[-110deg] border-accent"
              : "rotate-y-0 border-muted-foreground/30"
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: doorOpen ? "perspective(500px) rotateY(-110deg)" : "perspective(500px) rotateY(0deg)",
          }}
        >
          {/* Handle */}
          <div
            className={cn(
              "absolute right-2 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full transition-colors duration-300",
              getStatusColor().replace("text-", "bg-")
            )}
          />
          
          {/* Lock indicator */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2">
            <div
              className={cn(
                "h-6 w-6 rounded-full transition-all duration-300",
                status === "granted" && "bg-accent shadow-lg shadow-accent/50",
                status === "denied" && "bg-destructive shadow-lg shadow-destructive/50",
                status === "verifying" && "bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50",
                status === "scanning" && "bg-primary animate-pulse shadow-lg shadow-primary/50",
                status === "idle" && "bg-muted-foreground/50"
              )}
            />
          </div>

          {/* Ventilation slots */}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-0.5 w-8 rounded-full bg-muted-foreground/20"
              />
            ))}
          </div>
        </div>

        {/* Interior when open */}
        {doorOpen && (
          <div className="absolute inset-2 flex items-center justify-center rounded bg-muted-foreground/10">
            <div className="text-center">
              
              <p className="mt-1 text-xs text-muted-foreground">Vacio</p>
            </div>
          </div>
        )}
      </div>

      {/* Status ring */}
      <div
        className={cn(
          "absolute -inset-4 rounded-2xl border-2 opacity-0 transition-all duration-500",
          status === "scanning" && "animate-ping border-primary opacity-30",
          status === "granted" && "animate-pulse border-accent opacity-50"
        )}
      />
    </div>
  )
}
