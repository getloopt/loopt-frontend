import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { app, db } from '../../../../firebase-config'
import { Button } from "@/components/ui/ui/button";
import { Input } from "@/components/ui/ui/input";
import { Label } from "@/components/ui/ui/label";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import dashboard from "@/pages/dashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/ui/dropdown-menu"
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface Contact2Props {
  title?: string;
  description?: string;
}

export const Contact2 = (props: Contact2Props) => {
  console.log(props);
  const auth = getAuth(app)
  const { title, description } = props;
  const [department, setDepartment] = useState('')
  const [year, setYear] = useState('')
  const [section, setSection] = useState('')
  const [semester, setSemester] = useState('')
  const router = useRouter()

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

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      console.log("User not logged in")
      return
    }

    const departmentLabel = departments.find(d => d.value === department)?.label;

    const toRoman = (numStr: string): string => {
      const num = parseInt(numStr, 10);
      if (isNaN(num)) return numStr;
      const romanMap: { [key: number]: string } = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'
      };
      return romanMap[num] || numStr;
    };

    const yearRoman = toRoman(year);
    const semesterRoman = toRoman(semester);

    if(!departmentLabel || !yearRoman || !section || !semesterRoman){
      toast.error("Please fill all the details")
      return;
    }

    // Create user data object
    const userData = {
      uid: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      department: departmentLabel,
      year: yearRoman,
      section: section,
      semester: semesterRoman,
      CanUploadEdit: false,
      hasVerified: false,
      createdAt: new Date().toISOString(),
      // Here we're setting the default value for customNotificationPrompt.
      // This is a long string that explains how to write a funny notification for when a faculty arrives.
      // It's meant to help the user understand the format and style expected.
      customNotificationPrompt: `{faculty} {subject} - This period is in 10mins - Give me a notification text liner that's in the format of Subject upcoming: arrival_content- arrival_content is a funnier way of stating the faculty's arrival. Do not include the subject in arrival content in any way, just the faculty. No offensive language but you can light heartedly roast. 

Examples of funny arrival content:

Dr. Anderson spawns in 10 minutes

Dr. Anderson ETA : 10 mins

Aura nuke alert Dr. Anderson entering the class

Prof. Alexa is currently buffering—full download in 10 mins

Examples of not so funny arrival content:

Prof. Alexa's warp drive is charging—landing in 10 mins

Prof. Alexa's coffee-to-brain sync is at 90%—booting into class in 10 mins

Prof. Alexa's reality loading bar is at 85%—materializing in 10 mins

Again No offensive language on the faculty

Expected output format: Data Structures upcoming: [your creative arrival announcement]`,
changesDidPerDay: 0,
contentPolicyViolation: false,
updatedAt: new Date().toISOString()
    };

    // ✅ STEP 1: Save to localStorage immediately
    try {
      if (auth.currentUser?.uid) {
        localStorage.setItem(auth.currentUser.uid, JSON.stringify(userData));
        console.log('🔍 UserData:', userData);
        console.log('✅ User data saved to localStorage with key:', auth.currentUser.uid);
        console.log('✅ User data content:', userData);
      } else {
        console.error('❌ No currentUser.uid available for localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }

    // ✅ STEP 2: Save to Firestore
    try {
      const docRef = await addDoc(collection(db, "users"), userData);
      if (docRef) {
        console.log('✅ User data saved to Firestore with ID:', docRef.id);
        toast.success("Details submitted successfully")
        
        // Add a small delay to ensure data is saved before redirect
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error);
      toast.success("Details saved locally - will sync when online")
      
      // Still redirect after local save
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000);
    }
  };

  return (
    <div>
      <section className="py-32">
        <div className="container">
          <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-10 lg:flex-row lg:gap-20">
            <div className="mx-auto flex max-w-sm flex-col justify-between gap-10">
              <div className="text-center lg:text-left">
                <h1 className="mb-2 text-3xl font-bold lg:mb-1 lg:text-4xl font-proxima-nova letter-spacing-1">
                  {title}
                </h1>
                <p className="mt-4 font-proxima-nova text-neutral-50">{description}</p>
              </div>
            </div>
            <div className="mx-auto flex max-w-screen-md sm:w-[55vw] w-[90vw] flex-col gap-6 rounded-lg p-10 bg-black shadow-lg shadow-indigo-500">
              {/* Department Dropdown */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="department" className="text-white font-proxima-nova font-bold">Department</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                      {department ? departments.find(d => d.value === department)?.label : "Select Department"}
                      <ChevronDown className='w-5 h-5' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full sm:w-[600px] bg-zinc-800 border-none gap-2 pt-2">
                    {departments.map((dept) => (
                      <DropdownMenuItem 
                        className="cursor-pointer text-white sm:text-lg sm:p-4 p-2 hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova"
                        key={dept.value}
                        onClick={() => setDepartment(dept.value)}
                      >
                        {dept.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Year Dropdown */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="year" className="text-white font-proxima-nova font-bold">Year</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                      {year || "Select Year"}
                      <ChevronDown className='w-5 h-5' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full sm:w-[600px] bg-zinc-800 border-none gap-2 pt-2">
                    {years.map((y) => (
                      <DropdownMenuItem
                        className="cursor-pointer text-white sm:text-lg hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova numeric-input"
                        key={y}
                        onClick={() => setYear(y)}
                      >
                        Year {y}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Section Input */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="section" className="text-white font-proxima-nova font-bold">Section</Label>
                <Input
                  type="text"
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Enter your section"
                  className="bg-zinc-800 p-6 text-white border-none focus:ring-2 focus:ring-indigo-500 font-proxima-nova pl-7 placeholder:text-white/80 placeholder:text-sm"
                />
              </div>

              {/* Semester Dropdown */}
              <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="semester" className="text-white font-proxima-nova font-bold">Semester</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full mt-2 justify-between border-white/20 border-1 bg-zinc-800 p-6 hover:bg-zinc-800 hover:text-none cursor-pointer font-proxima-nova pl-7">
                      {semester || "Select Semester"}
                      <ChevronDown className='w-5 h-5' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full sm:w-[600px] bg-zinc-800 border-none gap-2 pt-2">
                    {semesters.map((sem) => (
                      <DropdownMenuItem
                        className="cursor-pointer text-white sm:text-lg numeric-input hover:bg-white/15 focus:text-white focus:bg-white/15 rounded-sm font-proxima-nova"
                        key={sem.value}
                        onClick={() => setSemester(sem.value)}
                      >
                        {sem.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button 
                className="w-[50%] translate-x-1/2 mt-2 sm:mt-4 bg-[#32317f] border-white/20 border-1 hover:bg-primary/90 hover:text-white hover:cursor-pointer font-proxima-nova"
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
