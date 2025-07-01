import { Calendar, Home, Inbox, Search, Settings, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from 'next/router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/ui/sidebar"

import { Button } from "@/components/ui/ui/button"
import { useAuth } from "@/contexts/AuthContext"

// Menu items.
const allItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Profile",
    url: "/about",
    icon: Info,
  },
  {
    title: "Timetable",
    url: "/timetable",
    icon: Calendar,
  },
];

export function AppSidebar() {
  const router = useRouter();
  const { logout, userData } = useAuth();

  const items = allItems.filter(item => {
    if (item.title === "Timetable") {
      return userData?.CanUploadEdit;
    }
    return true;
  });

  return (
    <Sidebar className="border-none rounded-xl flex flex-col h-full">
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupLabel className="h-10 text-[20px] font-proxima-nova font-medium">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="flex-1 overflow-y-auto">
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

      {/* Footer with Logout */}
      <SidebarFooter className="mt-auto p-4 border-t border-white/10">
        <Button variant="outline" className="w-full font-proxima-nova hover:bg-none button-logout hover:text-white border-white/20 border-1" onClick={logout}>
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 
