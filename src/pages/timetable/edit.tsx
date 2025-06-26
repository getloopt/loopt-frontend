import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import EditWeekSchedule from '@/components/edit-timetableslider/EditWeekSchedule';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useState } from 'react';

export default function TimetableEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const handleSidebarClick = () => {
    console.log('clicked sidebar')
    setIsOpen(prev => !prev)
  }

  return (
    <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative">
        {/* Mobile View - Only NavBar */}
        <div className="block sm:hidden">
          <NavBarDemo />
        </div>

        {/* Desktop View - Layout with Sidebar */}
        <div className="hidden lg:block">
          <Layout>
            <EditWeekSchedule />
          </Layout>
        </div>

        {/* Tablet View - Sidebar and Trigger */}
        <div className="hidden md:block lg:hidden">
          <div className="flex min-h-screen">
            <div className="flex-none">
              <AppSidebar />
            </div>
            <div className="flex-1">
              <SidebarTrigger className="absolute top-4 left-4" />
              <div className="mt-16">
                <EditWeekSchedule />
              </div>
            </div>
          </div>
        </div>

        {/* EditWeekSchedule - Visible on mobile only */}
        <div className="block md:hidden">
          <EditWeekSchedule />
        </div>
      </div>
    </SidebarProvider>
  );
} 