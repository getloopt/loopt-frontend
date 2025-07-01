import { Button } from "@/components/ui/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import {Edit,Hamburger, Link, Upload, LogOut } from "lucide-react"
import { Menu } from "lucide-react"
import { useRouter } from 'next/router'
import { useAuth } from "@/contexts/AuthContext"

  export function DropdownSM() {
    const router = useRouter();
    const { logout, userData } = useAuth();

    const handleEditClick = () => {
      router.push('/editTimetable');
    };

    const handleUploadClick = () => {
      router.push('/timetable/upload');
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="absolute top-0 left-100 !border-none">
        <Button variant="secondary" size="icon" className="size-8 !hover:bg-[rgb(59,59,62)] !bg-[rgb(23,23,23)] !border-none rounded-lg">
      <Menu className="w-5 h-5 text-white hover:text-white" />
    </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="min-w-40 !bg-[rgb(23,23,23)]/80 !border-none" 
          align="end"
        >
          <DropdownMenuGroup className="flex flex-col gap-2">
            <DropdownMenuItem 
              className="flex items-center gap-4 px-3 py-2 hover:!bg-[#141414]  cursor-pointer"
              onClick={handleUploadClick}
            >
              <Upload className="w-4 h-4 text-white" />
              <span className="text-white">Upload</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-4 px-3 py-2 hover:!bg-[#141414] cursor-pointer"
              onClick={handleEditClick}
            >
              <Edit className="w-4 h-4 text-white" />
              <span className="text-white">Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-4 px-3 py-2 hover:!bg-[#141414] cursor-pointer"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 text-white" />
              <span className="text-white">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
