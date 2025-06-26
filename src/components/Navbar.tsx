import { Home, Mail, ShoppingCart, User } from 'lucide-react'
import { NavBar } from "@/components/ui/ui/tubelight-navbar"


export function NavBarDemo() {
  const navItems = [
    { name: 'Home', url: '/dashboard', icon: Home },
    { name: 'About', url: '/about', icon: User },
    { name: 'Timetable', url: '/timetable', icon: Mail },
    {name:'Items',url:'/items',icon:ShoppingCart}
   
  ]

  return (
    
   <NavBar items={navItems} />
  )
}