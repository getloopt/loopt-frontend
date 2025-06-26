"use client"

import * as React from "react"
import { useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
      <AppSidebar />
      <main>
        <div className="md:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  )
} 