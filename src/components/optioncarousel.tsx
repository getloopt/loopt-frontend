import React, { useEffect, useMemo } from 'react'
import { Check, Sparkles } from 'lucide-react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/ui/carousel"
import { type CarouselApi } from "@/components/ui/ui/carousel"
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/ui/button'
import { doc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase-config'
import { toast } from 'sonner'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/ui/alert-dialog'
import { GradientButton } from './ui/gradient-button'
import { useRouter } from 'next/router'

interface OptionCarouselProps {
    setApi: (api: CarouselApi) => void;
    api: CarouselApi;
}

const OptionCarousel: React.FC<OptionCarouselProps> = ({ api, setApi }) => {
    const { userData } = useAuth();
    const router = useRouter();
    const canEditAndUpload = userData?.CanUploadEdit === true;
    const [isAtEnd, setIsAtEnd] = React.useState(false);
    
    const isEditPage = router.pathname === '/editTimetable';
    const isTimetable = router.pathname === '/timetable';
    console.log(isEditPage);
    const carouselDays = useMemo(() => {
        return isEditPage 
            ? ['Timetable Information', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }, [isEditPage]);

    // Get current day name
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const [selectedDay, setSelectedDay] = React.useState(todayName);
    const isCurrentDay = selectedDay === todayName;
  
    useEffect(() => {
      if (!api) {
        return;
      }
  
      const handleSelect = () => {
        const selectedIndex = api.selectedScrollSnap();
        const currentSelectedDay = carouselDays[selectedIndex];
        setSelectedDay(currentSelectedDay);
        setIsAtEnd(selectedIndex === carouselDays.length - 1);
      };
  
      api.on("select", handleSelect);
      // Initial check
      handleSelect();
  
      return () => {
        api.off("select", handleSelect);
      };
    }, [api, carouselDays]);

    const handleSaveAndPublish = async () => {
    if (!userData?.email) {
      toast.error("You must be logged in to publish.");
      return;
    }
    
    toast.info("Publishing timetable...");

    const usersCollection = collection(db, "users");
    const q = query(usersCollection, where("email", "==", userData.email));
    
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDocRef = querySnapshot.docs[0].ref;
        await updateDoc(userDocRef, {
          hasVerified: true
        });
        const timetableCollection = collection(db, "TimeTable");
        const timetableQuery = query(timetableCollection, where("department_uploaded", "==", userData.department), where("year_uploaded", "==", userData.year), where("section_uploaded", "==", userData.section), where("semester_uploaded", "==", userData.semester));
        const timetableSnapshot = await getDocs(timetableQuery);
        if (!timetableSnapshot.empty) {
          const timetableDocRef = timetableSnapshot.docs[0].ref;
          await updateDoc(timetableDocRef, {
            hasVerified: true
          });
        }
        toast.success("Timetable published successfully!", {
            description: "All students can now view the updated timetable.",
        });
        router.push('/dashboard');
      } else {
        throw new Error("User document not found.");
      }
    } catch (error) {
      console.error("Error publishing timetable:", error);
      toast.error("Failed to publish timetable.");
    }
  };

  const showSaveButton = canEditAndUpload && isAtEnd && isEditPage;

  return (
    <AlertDialog>
      <Carousel 
        setApi={setApi} 
        className={`sm:w-[300px] sm:h-[50px] w-[210px] h-[50px] bg-white/17 border-1 rounded-lg border-white/17 md:translate-x-2  ${isCurrentDay ? 'lg:translate-x-8 md:translate-x-10 max-sm:-translate-x-2' : 'lg:-translate-x-5'} ${isEditPage ? 'max-sm:translate-x-17 lg:translate-x-40 xl:translate-x-60 sm:translate-x-55 md:translate-x-28'  : 'xl:translate-x-2 sm:translate-x-1 '}  max-sm:mt-2 `}
      >
        <CarouselContent>
          {carouselDays.map((day) => (
            <CarouselItem key={day}>
              <div>
                <h1 className='text-white text-lg md:text-xl text-center mt-2 font-sans font-medium'>{day}</h1>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-[#141415] rounded-full border-1 border-white/17 p-2 hover:bg-[#141415] hover:border-white/17 hover:text-white"/>
        {showSaveButton ? (
          <AlertDialogTrigger asChild>
            <Button className="absolute right-[-90px] top-1/2 -translate-y-1/2 bg-[#141415] rounded-full border-1 border-white/17 p-2 h-8 w-20 hover:bg-[#141415] hover:border-white/17 hover:text-white">
              Save
            </Button>
          </AlertDialogTrigger>
        ) : (
          <CarouselNext className="bg-[#141415] rounded-full border-1 border-white/17 p-2 hover:bg-[#141415] hover:border-white/17 hover:text-white"/>
        )}
      </Carousel>
      <AlertDialogContent className="bg-zinc-900 border-white/20">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to publish?</AlertDialogTitle>
          <AlertDialogDescription>
            This will make the current timetable visible to all students in this section. Make sure all edits are complete.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row max-sm:flex-col-reverse sm:gap-4 gap-5">
          <AlertDialogCancel className="bg-zinc-800 text-white !border-white/20 hover:bg-zinc-700 hover:text-white mt-5 sm:w-[110px] sm:h-[50px] sm:translate-y-1 w-full">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction >
            <GradientButton variant="variant" className="w-full mt-5" onClick={() => handleSaveAndPublish()}> Yes, Publish <Sparkles className="w-4 h-4 ml-2" /> </GradientButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default OptionCarousel;