"use client"
import React, { useEffect, useState, useCallback, useMemo, useRef, useId } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, db } from '../../firebase-config'
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { Label } from '@/components/ui/ui/label'
import { Input } from '@/components/ui/ui/input'
import { Button } from '@/components/ui/ui/button'
import { ChevronDown, AlertCircle } from "lucide-react";
import { useNetworkStatus } from '@/hooks/use-network-status'


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
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/ui/dropdown-menu"
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { PromptEditor } from '@/components/ui/prompt'
import { getApiUrl } from '@/lib/config'// import { Textarea } from '@/components/ui/ui/textarea'

const AboutPage = () => {
  const { user, userData, loading, isAuthenticated, logout, refreshUserData } = useAuth();
  const [localData, setLocalData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const  isOnline  = useNetworkStatus();
  // Custom prompt validation states
  const [promptError, setPromptError] = useState<string>('');
  const [promptValue, setPromptValue] = useState<string>('');
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState<boolean>(false);
  // The reason we include the HTML <textarea> element (or useRef<HTMLTextAreaElement>) is because
  // sometimes we want to directly interact with the actual textarea in the DOM (the web page).
  // For example, we might want to focus it, clear it, or read its value without waiting for React to update.
  // useRef<HTMLTextAreaElement>(null) creates a reference that we can attach to our <textarea> element,
  // so we can access it directly in our code if needed.
  // In summary: We include the HTML textarea element tag (or its reference) to interact with the text area directly from our code.
    const textareaRef = useRef<HTMLTextAreaElement>(null);



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

  // Validate custom prompt - memoized to prevent recreating on every render
  const validatePrompt = useCallback((prompt: string): string => {
    if (!prompt.trim()) {
      return ''; // Empty is allowed
    }

    const allowedPlaceholders = ['{faculty}', '{subject}'];
    const placeholderRegex = /\{([^}]+)\}/g;
    const foundPlaceholders = [...prompt.matchAll(placeholderRegex)];
    
    for (const match of foundPlaceholders) {
      const fullPlaceholder = match[0];
      if (!allowedPlaceholders.includes(fullPlaceholder)) {
        return `Invalid placeholder: ${fullPlaceholder}. Only {faculty} and {subject} are allowed.`;
      }
    }
    
    return '';
  }, []);


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
      console.log('🔍 UserData:', userData);
      console.log('🔍 User:', user);
      console.log('✅ Setting localData from userData:', userData);
      setLocalData(userData);
          } else if (auth.currentUser?.uid) {
        // Always try localStorage if no userData (whether online or offline)
        console.log('🔍 Attempting to load data from localStorage for key:', auth.currentUser.uid);
        const offlineData = localStorage.getItem(auth.currentUser.uid);
        console.log('📦 LocalStorage data found:', offlineData);
      
      if (offlineData) {
        try {
          const parsedData = JSON.parse(offlineData);
          console.log('✅ Successfully parsed localStorage data:', parsedData);
          setLocalData(parsedData);
          
        } catch (error) {
          console.error("❌ Error parsing offline data:", error);
          toast.error('Error loading cached profile data');
        }
      } else {
        console.log('❌ No data found in localStorage');
        if (!isOnline) {
          toast.error('📱 No offline data available', {
            description: 'Please connect to the internet to load your profile',
            duration: 4000,
          });
        }
      }
    }
  }, [userData, isOnline, auth.currentUser?.uid]);

  // Initialize prompt value from localData
  useEffect(() => {
    if (localData?.notificationPrompt) {
      setPromptValue(localData.notificationPrompt);
    }
  }, [localData]);



  // Check for content policy violations
  useEffect(() => {
    const checkContentPolicyViolation = async () => {
      if (!user?.uid || !isOnline) return;
      console.log("URL", getApiUrl('customPushNotify'))
      
      try {
        const response = await fetch(`${getApiUrl('customPushNotify')}?userEmail=${user.email}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.contentPolicyViolation) {
            toast.error("Your custom prompt was reset due to content policy violations. Please try a different prompt.", {
              duration: 6000,
            });
            // Clear the prompt value since it was reset
            setPromptValue('');
            setLocalData((prev: any) => ({ ...prev, notificationPrompt: '' }));
          }
        }
      } catch (error) {
        console.error("Error checking content policy violation:", error);
      }
    };

    checkContentPolicyViolation();
  }, [user?.uid, isOnline]);



  // Save custom prompt
  const saveCustomPrompt = async (prompt: string) => {
    if (!user?.uid || !isOnline) {
      toast.error("You are offline. Please connect to the internet to save your custom prompt.");
      return;
    }
    console.log("Prompt:", prompt);
    if(prompt === "") {
     console.log("Prompt is empty");
     return;
    }
    const error = validatePrompt(prompt);
    
    console.log("Validation error:", error);

    if (error) {
      setPromptError(error);
      toast.error(error);
      return;
    }

    setPromptError("");

    // Show loading toast
    const loadingToast = toast.loading("Testing your custom prompt...");

    // Now do the POST request here, since the prompt is valid
    try {
      const response = await fetch(getApiUrl('customPushNotify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          customPrompt: prompt.trim()
        })
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (response.ok) {
        // Success - prompt passed test and notification was sent
        toast.success(data.message || "Custom prompt saved successfully! Check your notifications for a test message.", {
          duration: 5000,
        });
        setLocalData({...localData, notificationPrompt: prompt});
        
        // Show the generated test message if available
  
  
      } else {
        // Handle different types of errors
        if (data.error === 'INVALID_PLACEHOLDER') {
          setPromptError(data.message);
          toast.error(data.message);
        } else if (data.error === 'CONTENT_POLICY_VIOLATION') {
          setPromptError("Content policy violation detected. Please use a different prompt.");
          toast.error("🚫 Content policy violation detected. Please use a different prompt.", {
            duration: 6000,
          });
        } else if (data.error === 'TEST_FAILED') {
          toast.error(data.message || "Failed to test prompt. Please try again.");
        } else if (data.error === 'DAILY_LIMIT_EXCEEDED') {
          toast.error(`🚫 ${data.message}`, {
            duration: 8000,
          });
        } else {
          toast.error(data.message || "Failed to save custom prompt.");
        }
      }
    } catch (error) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      console.error("Error saving custom prompt:", error);
      toast.error("Failed to save custom prompt. Please try again.");
    }
  };

  const updateUser = async () => {
    if (!user?.email) return;
    if(!isOnline) {
      toast.error("You are offline. Please connect to the internet to update your profile.");
      return;
    }
    try {
      const usersCollection = collection(db, "users");
      const userQuery = query(usersCollection, where("email", "==", user.email));
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const userRef = doc(db, "users", querySnapshot.docs[0].id);

        // Convert department/year/semester to timetable format before saving
        const deptLabel = departments.find(d => d.value === localData?.department)?.label || localData?.department;

        const toRoman = (numStr: string): string => {
          const num = parseInt(numStr, 10);
          if (isNaN(num)) return numStr;
          const romanMap: { [key: number]: string } = {
            1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'
          };
          return romanMap[num] || numStr;
        };

        await updateDoc(userRef, {
          department: deptLabel,
          year: toRoman(localData?.year),
          section: localData?.section,
          semester: toRoman(localData?.semester)
        });
        // Refresh the global user data
        await refreshUserData();
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update profile. Please try again.");
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
        
        // Clear localStorage
        if (auth.currentUser?.uid) {
          localStorage.removeItem(auth.currentUser.uid);
        }
        
        await logout();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  }

  if (!isMounted) {
    return null;
  }

  if (!isAuthenticated || !localData) {
    return null;
  }

  const getDepartmentValue = (dept: string) => {
    const foundDept = departments.find(d => d.label === dept);
    return foundDept ? foundDept.value : dept;
  }

  const fromRoman = (roman: string): string => {
    if (!roman) return "";
    const romanMap: { [key: string]: number } = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8
    };
    // @ts-ignore
    return romanMap[roman]?.toString() || roman;
  };

  const errorClass = promptError
    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
    : "border-white/20 focus:ring-indigo-500 focus:border-indigo-500";

  const AboutContent = () => (
    <section className="py-12 sm:xl:ml-60 sm:lg:ml-40 sm:md:ml-21 sm:md:mr-10 sm:ml-35">
      <div className="container">
        <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-10 lg:flex-row lg:gap-20">
          <div className="mx-auto flex max-w-screen-md sm:w-[55vw] w-[90vw] flex-col gap-6 rounded-lg p-10 bg-black shadow-lg shadow-indigo-500 mt-10">
            <div className="text-center lg:text-left">
              <h1 className="mb-2 text-3xl font-bold lg:mb-1 lg:text-4xl font-proxima-nova letter-spacing-1">
                About
              </h1>
              <p className="mt-4 font-proxima-nova text-neutral-50">You can check your details here</p>
              
              {!isOnline && (
                <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                  <p className="text-orange-300 text-sm font-proxima-nova flex items-center justify-center gap-2">
                    📱 <span>Offline Mode: Showing cached data</span>
                  </p>
                </div>
              )}
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="department" className="text-white font-proxima-nova font-bold">Department</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                    {localData?.department ? departments.find(d => d.value === getDepartmentValue(localData.department))?.label : "Select Department"}
                      <ChevronDown className='w-5 h-5' />
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
                    {localData?.year ? `Year ${fromRoman(localData.year)}` : "Select Year"}
                    <ChevronDown className='w-5 h-5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-sm:w-[90vw] sm:w-[55vw] bg-zinc-800 border-none gap-2 pt-2">
                  {years.map((y) => (
                    <DropdownMenuItem className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova numeric-input" key={y} onClick={() => setLocalData({...localData, year: y})}>
                      Year {y}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="section" className="text-white font-proxima-nova font-bold">Section</Label>
              <Input type="text" id="section" value={localData?.section || ""} onChange={(e) => setLocalData({...localData, section: e.target.value.toUpperCase()})} placeholder="Enter your section" className="bg-zinc-800 mt-2 p-6  text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80" />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="semester" className="text-white font-proxima-nova font-bold">Semester</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                    {localData?.semester ? semesters.find(s => s.value === fromRoman(localData.semester))?.label : "Select Semester"}
                    <ChevronDown className='w-5 h-5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-sm:w-[90vw] sm:w-[55vw] bg-zinc-800 border-none gap-2 pt-2">
                  {semesters.map((sem) => (
                    <DropdownMenuItem className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova numeric-input" key={sem.value} onClick={() => setLocalData({...localData, semester: sem.value})}>
                      {sem.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-8 p-4 border border-white/20 rounded-lg min-h-[220px]">
              <h2 className="text-stone-400 font-proxima-nova font-bold text-lg mb-4 border-b border-white/20 pb-2">
                User Preferences
              </h2>
              {/* Push Notifications Customisation */}
              <div className="mb-4 p-4">
                <p className="text-white/80 font-proxima-nova text-sm mb-2">
                  Write custom notification prompts using <span className="font-mono px-1 rounded text-green-500">{'{faculty}'}</span> and <span className="font-mono px-1 rounded text-green-500">{'{subject}'}</span> placeholders wherever required,the prompt should be less than 500 characters.
                </p>
                
                {/* Collapsible Example Prompt */}
                <div className="mb-4">
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="mt-2 text-sm font-semibold text-white font-proxima-nova mb-2">
                        Show custom prompt example
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 bg-zinc-800 border border-white/20 hover:bg-zinc-700"
                         onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
                      >
                        <motion.div
                          animate={{ rotate: isCollapsibleOpen ? 180 : 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 200,
                            damping: 25,
                            mass: 0.5
                          }}
                        >
                          <ChevronDown className="h-4 w-4 text-white" />
                        </motion.div>
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </div>
                                        {/* Enhanced Animation Container */}
                    <AnimatePresence>
                      {isCollapsibleOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ 
                            height: {
                              type: "spring",
                              stiffness: 120,
                              damping: 32,
                              mass: 1.0
                            },
                            opacity: {
                              duration: 0.5,
                              delay: 0.05
                            }
                          }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2">
                            <div className="rounded-md border border-white/20 bg-zinc-800 px-4 py-3 font-mono text-sm text-white/90">
                              <p className="mb-2 font-proxima-nova">Example prompt:</p>
                              <p className="text-green-400 font-mono text-xs leading-relaxed">
                                {`{faculty} {subject} - This period is in 10mins - Give me a notification text liner that's in the format of Subject upcoming: arrival_content- arrival_content is a funnier way of stating the faculty's arrival. Do not include the subject in arrival content in any way, just the faculty. No offensive language but you can light heartedly roast.`}
                              </p>
              
                    
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                </div>
                
                {/* Info box about testing and daily limits */}
        
                
                <div >
                  <PromptEditor
                    initialPrompt={promptValue}
                    onSave={saveCustomPrompt}
                    error={promptError}
                  />
                </div>
  
              
              </div>
            </div>
            <Button className="inline-flex items-center justify-center whitespace-nowrap rounded-md sm:hover:cursor-pointer text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground hover:bg-primary/90 hover:cursor-pointer h-10 px-4 py-2 w-[50%] translate-x-1/2 z-20 mt-2 bg-[#32317f] border-white/20 border-1 font-proxima-nova" onClick={updateUser}>
              Save Changes
            </Button>
            <div className="mt-8 p-4 border border-white/20 rounded-lg">
              <h2 className="text-stone-400 font-proxima-nova font-bold text-lg mb-4 border-b border-white/20 pb-2">Logout</h2>
              <p className="text-white/80 font-proxima-nova text-sm">This action will logout you from the app.</p>
              <Button className="w-full mt-4 bg-zinc-800 border-white/20 border-1 hover:bg-zinc-700 hover:cursor-pointer font-proxima-nova" onClick={logout}>Logout</Button>
            </div>
            
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
                    <AlertDialogTitle className="text-white font-proxima-nova text-lg">Confirm Deletion <AlertCircle className="text-red-500 inline-block ml-1 h-5 w-5" /></AlertDialogTitle>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <div className="sm:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.3,
            delay: 0.1,
            ease: "easeOut"
          }}
        >
          <AboutContent />
        </motion.div>
      </div>
      <div className="hidden sm:block">
        <Layout>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.1,
              ease: "easeOut"
            }}
          >
            <AboutContent />
          </motion.div>
        </Layout>
      </div>
    </motion.div>
  )
}

export default AboutPage;