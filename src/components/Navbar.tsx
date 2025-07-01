import { Home, Mail, ShoppingCart, User } from 'lucide-react'
import { NavBar } from "@/components/ui/ui/tubelight-navbar"
import { useAuth } from '@/contexts/AuthContext'


export function NavBarDemo() {
  const { userData } = useAuth();
  const allNavItems = [
    { name: 'Home', url: '/dashboard', icon: Home },
    { name: 'Profile', url: '/about', icon: User },
    { name: 'Timetable', url: '/timetable', icon: Mail },
   
  ]

  const navItems = allNavItems.filter(item => {
    if (item.name === "Timetable") {
      return userData?.CanUploadEdit;
    }
    return true;
  });

  return (
   <NavBar items={navItems} />
  )
}