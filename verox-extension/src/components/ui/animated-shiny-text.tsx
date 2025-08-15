import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import React from "react"

interface AnimatedShinyTextProps {
  children: React.ReactNode
  className?: string
  shimmerWidth?: number
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
}: AnimatedShinyTextProps) {
  return (
    <motion.div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-md",
        className
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <span className="relative z-10 whitespace-nowrap text-white dark:text-black">
        {children}
      </span>
      <motion.div
        className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)]"
        animate={{
          transform: [
            "skew(-13deg) translateX(-100%)",
            "skew(-13deg) translateX(200%)",
          ],
        }}
        transition={{
          duration: 2,
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 1,
        }}
      >
        <div
          className="relative h-full bg-white/20"
          style={{ width: `${shimmerWidth}px` }}
        />
      </motion.div>
    </motion.div>
  )
}
