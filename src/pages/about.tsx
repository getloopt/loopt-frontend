"use client"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { db } from '../../firebase-config'
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { Label } from '@/components/ui/ui/label'
import { Input } from '@/components/ui/ui/input'
import { Button } from '@/components/ui/ui/button'
import { IoMdArrowDropdown } from "react-icons/io";
import { PiWarningCircleLight } from "react-icons/pi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/ui/dropdown-menu"
import { NavBarDemo } from '@/components/Navbar'
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

const AboutPage = () => {
  const { user, userData, loading, isAuthenticated, logout, refreshUserData } = useAuth();
  const [localData, setLocalData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const departments = [
    { value: "bme", label: "Biomedical Engineering" },
    { value: "che", label: "Chemical Engineering" },
    { value: "civil", label: "Civil Engineering" },
    { value: "cse", label: "Computer Science and Engineering" },
    { value: "eee", label: "Electrical and Electronics Engineering" },
    { value: "ece", label: "Electronics and Communication Engineering" },
    { value: "it", label: "Information Technology" },
    { value: "mech", label: "Mechanical Engineering" }
  ];

  const years = ["1", "2", "3", "4"];
  const semesters = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
    { value: "3", label: "Semester 3" },
    { value: "4", label: "Semester 4" },
    { value: "5", label: "Semester 5" },
    { value: "6", label: "Semester 6" },
    { value: "7", label: "Semester 7" },
    { value: "8", label: "Semester 8" }
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/signup');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (userData) {
      setLocalData(userData);
    }
  }, [userData]);

  const updateUser = async () => {
    if (!user?.email) return;
    try {
      const usersCollection = collection(db, "users");
      const userQuery = query(usersCollection, where("email", "==", user.email));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const userRef = doc(db, "users", querySnapshot.docs[0].id);
        await updateDoc(userRef, {
          department: localData?.department,
          year: localData?.year,
          section: localData?.section,
          semester: localData?.semester
        });
        // Refresh the global user data
        await refreshUserData();
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update profile. Please try again.");
    }
  }

  const deleteAccount = async () => {
    if (!user?.email) return;
    try {
      const usersCollection = collection(db, "users");
      const userQuery = query(usersCollection, where("email", "==", user.email));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const userRef = doc(db, "users", querySnapshot.docs[0].id);
        await deleteDoc(userRef);
        await logout();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  }

  if (loading || !isMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-white font-proxima-nova">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !localData) {
    return null;
  }

  const AboutContent = () => (
    <section className="py-12 sm:xl:ml-60 sm:lg:ml-40 sm:md:ml-21 sm:md:mr-10 sm:ml-35">
      <div className="container">
        <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-10 lg:flex-row lg:gap-20">
          <div className="flex justify-end items-center py-2 mb-2.5 absolute sm:top-4 sm:right-4 top-0 right-2">
            <Button
              className="bg-zinc-800 border-white/20 border-1 hover:bg-white hover:text-black hover:cursor-pointer font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
          <div className="mx-auto flex max-w-screen-md sm:w-[55vw] w-[90vw] flex-col gap-6 rounded-lg p-10 bg-black shadow-lg shadow-indigo-500 mt-10">
            <div className="text-center lg:text-left">
              <h1 className="mb-2 text-3xl font-bold lg:mb-1 lg:text-4xl font-proxima-nova letter-spacing-1">
                About
              </h1>
              <p className="mt-4 font-proxima-nova text-neutral-50">You can check your details here</p>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email" className="text-white font-proxima-nova font-bold">Email</Label>
              <Input type="text" id="email" value={user?.email || ""} disabled className="bg-zinc-800 mt-2 p-6 text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80" />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="department" className="text-white font-proxima-nova font-bold">Department</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                    {localData?.department ? departments.find(d => d.value === localData.department)?.label : "Select Department"}
                    <IoMdArrowDropdown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-sm:w-[90vw] sm:w-[55vw] bg-zinc-800 border-none gap-2 pt-2">
                  {departments.map((dept) => (
                    <DropdownMenuItem className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova" key={dept.value} onClick={() => setLocalData({...localData, department: dept.value})}>
                      {dept.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="year" className="text-white font-proxima-nova font-bold">Year</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                    {localData?.year ? `Year ${localData.year}` : "Select Year"}
                    <IoMdArrowDropdown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-sm:w-[90vw] sm:w-[55vw] bg-zinc-800 border-none gap-2 pt-2">
                  {years.map((y) => (
                    <DropdownMenuItem className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova" key={y} onClick={() => setLocalData({...localData, year: y})}>
                      Year {y}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="section" className="text-white font-proxima-nova font-bold">Section</Label>
              <Input type="text" id="section" value={localData?.section || ""} onChange={(e) => setLocalData({...localData, section: e.target.value})} placeholder="Enter your section" className="bg-zinc-800 mt-2 p-6  text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80" />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="semester" className="text-white font-proxima-nova font-bold">Semester</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                    {localData?.semester ? semesters.find(s => s.value === localData.semester)?.label : "Select Semester"}
                    <IoMdArrowDropdown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-sm:w-[90vw] sm:w-[55vw] bg-zinc-800 border-none gap-2 pt-2">
                  {semesters.map((sem) => (
                    <DropdownMenuItem className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova" key={sem.value} onClick={() => setLocalData({...localData, semester: sem.value})}>
                      {sem.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button className="inline-flex items-center justify-center whitespace-nowrap rounded-md sm:hover:cursor-pointer text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground hover:bg-primary/90 hover:cursor-pointer h-10 px-4 py-2 w-[50%] translate-x-1/2 z-20 mt-2 bg-[#32317f] border-white/20 border-1 font-proxima-nova" onClick={updateUser}>
              Save Changes
            </Button>
            <div className="mt-8 p-4 border border-white/20 rounded-lg">
              <h2 className="text-red-500 font-proxima-nova font-bold text-lg mb-4 border-b border-white/20 pb-2">Delete Account</h2>
              <p className="text-white/80 font-proxima-nova text-sm">This action is irreversible and will delete your account permanently.</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="w-full mt-4 bg-red-500 border-white/20 border-1 hover:bg-red-800 hover:cursor-pointer font-proxima-nova">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-white/20 sm:max-w-[425px] max-w-[85%] w-full">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white font-proxima-nova text-lg">Confirm Deletion <PiWarningCircleLight className="text-red-500 inline-block ml-1 h-5 w-5" /></AlertDialogTitle>
                    <AlertDialogDescription className="text-white font-proxima-nova text-sm">This action is irreversible and will delete your account permanently.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="sm:space-x-2">
                    <AlertDialogCancel className="bg-zinc-800 text-white border-white/20 hover:bg-zinc-700 font-proxima-nova sm:w-auto w-full">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-900 text-white hover:bg-red-500 font-proxima-nova sm:w-auto w-full" onClick={deleteAccount}>
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div>
      <div className="sm:hidden">
        <NavBarDemo />
        <AboutContent />
      </div>
      <div className="hidden sm:block">
        <Layout>
          <AboutContent />
        </Layout>
      </div>
    </div>
  )
}

export default AboutPage;