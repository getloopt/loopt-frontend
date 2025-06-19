import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { app, db } from '../../../../firebase-config'

import { Button } from "@/components/ui/ui/button";
import { Input } from "@/components/ui/ui/input";
import { Label } from "@/components/ui/ui/label";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

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

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      console.log("User not logged in")
      return
    }
    setDepartment(department)
    setYear(year)
    setSection(section) 
    console.log("--------------------------------")
    console.log(department)
    console.log(year)
    console.log(section)  
    console.log(auth.currentUser?.email)
   
    const docRef = await addDoc(collection(db, "users"), {
      email: auth.currentUser?.email,
      department: department,
      year: year,
      section: section,
    });
    if(docRef){
      alert("Details submitted successfully")
      router.push('/')
    }
  };



  return (
    <div>
    <section className="py-32">
      <div className="container">
        <div className="mx-auto flex max-w-screen-xl flex-col justify-between gap-10 lg:flex-row lg:gap-20">
          <div className="mx-auto flex max-w-sm flex-col justify-between gap-10">
            <div className="text-center lg:text-left">
              <h1 className="mb-2 text-5xl font-semibold lg:mb-1 lg:text-6xl">
                {title}
              </h1>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>
          
          </div>
          <div className="mx-auto flex max-w-screen-md flex-col gap-6 rounded-lg border p-10 bg-gray-900 border-none shadow-indigo-500 shadow-xl">
            <div className="grid w-full sm:w-[30vw] sm:h-[10vh] items-center gap-1.5">
              <Label htmlFor="department">Department</Label>
              <select 
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-gray-900 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select your department</option>
                <option value="bme">Biomedical Engineering</option>
                <option value="che">Chemical Engineering</option>
                <option value="civil">Civil Engineering</option>
                <option value="cse">Computer Science and Engineering</option>
                <option value="eee">Electrical and Electronics Engineering</option>
                <option value="ece">Electronics and Communication Engineering</option>
                <option value="it">Information Technology</option>
                <option value="mech">Mechanical Engineering</option>
              </select>
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="Year">Year</Label>
              <select 
                id="year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-gray-900 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select your year</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="section">Section</Label>
              <Input 
                type="text" 
                id="section" 
                placeholder="Section" 
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
            </div>
            <Button className="w-full bg-slate-50 text-black hover:bg-slate-900 hover:text-white " onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
};
