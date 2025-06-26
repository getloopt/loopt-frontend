// import FormTimetable from '../components/edit-timetableslider/Form-timetable';
import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import EditWeekSchedule from '@/components/edit-timetableslider/EditWeekSchedule';
import { SidebarProvider, SidebarTrigger, Sidebar } from '@/components/ui/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { useState } from 'react';

const TimetablePage = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handlesidebarclick = () => {
    console.log('clicked sidebar')
    setIsOpen(prev => !prev) // Toggle between true and false
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
        <div className="hidden sm:block lg:hidden">
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
};

export default TimetablePage; 