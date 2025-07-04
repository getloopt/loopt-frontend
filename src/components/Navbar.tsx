import { Home, Mail, ShoppingCart, User } from 'lucide-react'
import { NavBar } from "@/components/ui/ui/tubelight-navbar"
import { useAuth } from '@/contexts/AuthContext'

// Define nav items outside component to prevent recreating on each render
const BASE_NAV_ITEMS = [
  { name: 'Home', url: '/dashboard', icon: Home },
  { name: 'Profile', url: '/about', icon: User },
  { name: 'Timetable', url: '/timetable', icon: Mail },
];

export function NavBarDemo() {
  const { userData, loading: authLoading } = useAuth();

  // Only filter nav items if we have loaded auth state
  const navItems = !authLoading ? BASE_NAV_ITEMS.filter(item => {
    if (item.name === "Timetable") {
      return userData?.CanUploadEdit;
    }
    return true;
  }) : BASE_NAV_ITEMS;

  // Since we only have Home and Profile, no need to check auth loading

  return (
    <div className='sm:hidden'>
      <NavBar items={navItems} />
    </div>
  );
}