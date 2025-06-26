import { Calendar, Home, Inbox, Search, Settings, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/router'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/ui/sidebar"

// Menu items.
const items = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "About",
    url: "/about",
    icon: Info,
  },
  {
    title: "Timetable",
    url: "/timetable",
    icon: Calendar,
  },

]

export function AppSidebar() {
  const router = useRouter();

  return (
    <Sidebar className="border-none rounded-xl">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-10 text-[20px] font-proxima-nova font-medium">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = router.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`!text-md !font-proxima-nova`}
                    >
                      <Link href={item.url} className="flex items-center gap-7">
                        <item.icon className={`!w-5 !h-5 ${isActive ? 'text-white' : 'text-white/70'}`} />
                        <span className={`font-proxima-nova ${isActive ? 'text-white' : 'text-white/80'}`}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 