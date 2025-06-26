import React from "react";
import { NavBarDemo } from '@/components/Navbar';
import Layout from '@/components/Layout';
import Link from 'next/link';
import { Button } from "@/components/ui/ui/button";
import { Edit2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import CurrentTimeTable from "@/components/correct-timetable/CurrentTimeTable";

export default function TimetableDashboard() {

  return (
    <div className="relative">
      {/* Mobile View - Only NavBar */}
      <div className="block sm:hidden">
        <NavBarDemo />
      </div>

      {/* Desktop View - Layout with Sidebar */}
      <div className="hidden lg:block">
        <Layout>
          <TimetableContent />
        </Layout>
      </div>

      {/* Tablet and Mobile Content */}
      <div className="block lg:hidden">
        <TimetableContent />
      </div>
    </div>
  );
}

function TimetableContent() {
  const { userData,logout } = useAuth();
  const canEditAndUpload = userData?.CanUploadEdit === true;

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] p-4">
         <div className="flex justify-end items-center py-2 mb-2.5 absolute sm:top-4 top-0 right-8">
            <Button
              className=" button-logout border-white/20 border-1 font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
          </div>

        
        {canEditAndUpload && (
          <>
            <Link href="/timetable/upload">
              <Button className="flex items-center gap-2 px-6 py-4 text-lg">
                <Edit2 className="w-5 h-5" />
                Upload
              </Button>
            </Link>
          </>
        )}
      </div>
  );
} 