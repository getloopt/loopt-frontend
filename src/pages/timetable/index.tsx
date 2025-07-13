import React from "react";
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';

import { Button } from "@/components/ui/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import CurrentTimeTable from "@/components/correct-timetable/CurrentTimeTable";
import { Sidebar, SidebarProvider, SidebarTrigger } from "@/components/ui/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useState } from "react";
import { useRouter } from "next/router";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase-config";
import { DropdownSM } from "@/components/dropdown-sm";

export default function TimetableDashboard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative">
          {/* Mobile View - Only NavBar */}

          {/* Desktop View - Layout with Sidebar */}
          <div className="hidden lg:block">
            <Layout>
              <TimetableContent />
            </Layout>
          </div>

          {/* Tablet View */}
          <div className="max-sm:hidden md:block lg:hidden">
            <div className="flex min-h-screen">
              <div className="flex-none">
                <AppSidebar />
              </div>
              <div className="flex-1">
                <SidebarTrigger className="fixed top-4 left-4 md:left-6 ml-3"  />
                <div className="translate-x-30 max-md:translate-x-20 md:-translate-x-3 ">
                  <TimetableContent />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Content */}
          <div className="translate-x-10 hidden max-sm:block w-[100%]">
            <TimetableContent />
          </div>
        </div>
      </SidebarProvider>
    </motion.div>
  );
}

function TimetableContent() {
  const { userData, logout } = useAuth();
  const canEditAndUpload = userData?.CanUploadEdit === true;
  const router = useRouter();

  const handleEditClick = async () => {
    if (!userData?.email) return;
    
    // Find the user's document to set hasVerified to false
    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("email", "==", userData.email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDocRef = querySnapshot.docs[0].ref;
      await updateDoc(userDocRef, {
        hasVerified: false
      });
      router.push('/editTimetable');
    } else {
      console.error("Could not find user document to update.");
      // Still navigate, maybe the doc will be created later
      router.push('/editTimetable');
    }
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-[100vh] w-[100%] p-4 md:translate-x-80 lg:translate-x-80 mt-10 xl:translate-x-120"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: 0.1,
        ease: "easeOut"
      }}
    >
      <div className="flex justify-end items-center py-2 mb-2.5 absolute sm:top-4 top-[-25px] right-8 md:hidden lg:hidden sm:hidden ">
        <Button
          className="button-logout border-white/20 border-1 font-proxima-nova max-sm:hidden"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
      <div className="mt-1 md:-translate-x-50 max-sm:-translate-x-10">
        <CurrentTimeTable />
      </div>

      {canEditAndUpload && (
        <div className="fixed top-2 xl:left-30 2xl:left-80 z-5 lg:left-10 md:left-10 sm:left-26 max-sm:-left-23 max-sm:-mt-10 cursor-pointer">
          <DropdownSM />
        </div>
      )}
    </motion.div>
  );
} 