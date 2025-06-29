import React, { useState } from "react";
import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import { ImageUploadDemo } from "@/components/imageUpload";
import { SidebarProvider, SidebarTrigger } from '@/components/ui/ui/sidebar';
import {AppSidebar} from '@/components/app-sidebar'




export default function UploadPage() {
    const [isOpen, setIsOpen] = useState(false);
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
          <UploadContent />
        </Layout>
      </div>

      {/* Tablet and Mobile Content */}
      <div className="max-sm:hidden md:block lg:hidden">
          <div className="flex min-h-screen">
            <div className="flex-none">
              <AppSidebar />
            </div>
            <div className="flex-1">
              <SidebarTrigger className="fixed top-4 left-4 z-50 md:left-6" />
              <div className="translate-x-30">
               <UploadContent/>
              </div>
            </div>
          </div>
        </div>
        <div className="translate-x-10 hidden max-sm:block ">
               <UploadContent/>
              </div>

        </div>

    </SidebarProvider>



  );
}

function UploadContent() {
    return (
        <div className="flex justify-center items-center min-h-[100vh]">
            <ImageUploadDemo />
        </div>
    );
}