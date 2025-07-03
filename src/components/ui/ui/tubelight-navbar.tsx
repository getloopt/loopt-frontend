import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/router"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon?: any
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const router = useRouter()

  // Helper to determine the active tab name
  const getActiveTabName = () => {
    if (!items || items.length === 0) return null;
    const currentItem = items.find(item => item.url === router.pathname);
    return currentItem ? currentItem.name : items[0].name;
  }

  const [activeTab, setActiveTab] = useState<string | null>(getActiveTabName())
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  // Update active tab when route changes or items array changes
  useEffect(() => {
    const newActiveTab = getActiveTabName();
    if (newActiveTab !== activeTab) {
      setActiveTab(newActiveTab);
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

  // Smooth mount/unmount transitions
  useEffect(() => {
    setIsVisible(true)
    return () => setIsVisible(false)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ 
            duration: 0.3,
            ease: "easeInOut"
          }}
          className={cn(
            "fixed bottom-0 sm:bottom-auto sm:top-0 w-full sm:w-auto sm:left-1/2 sm:-translate-x-1/2 z-100 mb-6 sm:pt-6",
            className
          )}
        >
          <div className="absolute -bottom-8 sm:-bottom-7 flex items-center justify-around sm:justify-center sm:gap-3 w-full h-20 border border-border backdrop-blur-lg py-1 sm:px-1 sm:rounded-full shadow-lg">
            {items.map((item) => {
              const isActive = item.url === router.pathname

              return (
                <motion.div
                  key={item.name}
                  className="relative"
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.95
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.6
                  }}
                >
                  <Link
                    href={item.url}
                    onClick={() => setActiveTab(item.name)}
                    className={cn(
                      "relative cursor-pointer text-sm font-semibold px-4 sm:px-6 py-2 rounded-full block",
                      "text-foreground/80 hover:text-foreground transition-all duration-150 ease-out",
                      isActive && "text-primary"
                    )}
                  >
                    <span className="relative z-30">
                      {item.name}
                    </span>
                    
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      initial={false}
                      animate={{
                        opacity: isActive ? 1 : 0
                      }}
                      transition={{
                        duration: 0.15
                      }}
                    />
                  </Link>
                  
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 bg-muted rounded-full -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 30,
                        mass: 1.2
                      }}
                      initial={false}
                    >
                      <motion.div 
                        className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut"
                        }}
                      />
                      <motion.div 
                        className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.05,
                          ease: "easeOut"
                        }}
                      />
                      <motion.div 
                        className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.3,
                          delay: 0.1,
                          ease: "easeOut"
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}