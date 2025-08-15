import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import React from "react"

interface BlurFadeProps {
  children: React.ReactNode
  className?: string
  variant?: {
    hidden: { y: number; opacity: number; filter: string }
    visible: { y: number; opacity: number; filter: string }
  }
  duration?: number
  delay?: number
  yOffset?: number
  inView?: boolean
  inViewMargin?: string
  blur?: string
}

const defaultVariant = {
  hidden: { y: 6, opacity: 0, filter: "blur(6px)" },
  visible: { y: 0, opacity: 1, filter: "blur(0px)" },
}

export function BlurFade({
  children,
  className,
  variant = defaultVariant,
  duration = 0.4,
  delay = 0,
  yOffset = 6,
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variant}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
