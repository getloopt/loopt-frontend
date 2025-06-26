import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/router"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(items[0].name)
  const [isMobile, setIsMobile] = useState(false)

  // Update active tab when route changes
  useEffect(() => {
    const currentItem = items.find(item => item.url === router.pathname)
    if (currentItem) {
      setActiveTab(currentItem.name)
    }
  }, [router.pathname, items])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 w-full sm:w-auto sm:left-1/2 sm:-translate-x-1/2 z-50 mb-6 sm:pt-6",
        className,
      )}
    >
      <div className="absolute -bottom-7 flex items-center justify-around sm:justify-center sm:gap-3 w-full h-20 bg-[#231F3A]/50 border border-border backdrop-blur-lg py-1 sm:px-1 sm:rounded-full shadow-lg">
        {items.map((item) => {
          const isActive = item.url === router.pathname

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-4 sm:px-6 py-2 rounded-full transition-colors",
                "text-foreground/80",
                isActive && "bg-muted text-primary",
              )}
            >
              <span>{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                    <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
