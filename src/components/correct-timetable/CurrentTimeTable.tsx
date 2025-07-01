import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Progress } from "@/components/ui/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/ui/tooltip";
import { cn } from '@/lib/utils';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase-config';
import { useAuth, UserData } from '@/contexts/AuthContext';
import OptionCarousel from '../optioncarousel';
import { type CarouselApi } from "@/components/ui/ui/carousel"

// --- Type definitions ---
interface Activity {
  code: string;
  courseTitle: string;

  faculty: { initial: string; name: string }[];
}

interface Period {
  period: string;
  iscode: boolean;
  startTime: string;
  endTime: string;
  Activity: Activity[];
}

interface TimetableData {
  day: { [key: string]: Period[] };
  PeriodandTimings: { period: string, timing: string }[];
  classRoom: string;
}

interface UserDataWithVerification extends UserData {
  hasVerified?: boolean;
  CanUploadEdit?: boolean;

}

interface TimeTableDoc {
  day: { [key: string]: Period[] };
  PeriodandTimings: { period: string, timing: string }[];
  classRoom: string;
  email: string;
  hasVerified?: boolean;
}

// --- Helper function to parse time ---
const parseTime = (timeStr: string): Date => {
  const today = new Date();

  // 1) 12-hour format with AM/PM
  const twelveHr = timeStr.match(/^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (twelveHr) {
    let hours = parseInt(twelveHr[1], 10);
    const minutes = parseInt(twelveHr[2], 10);
    const ampm = twelveHr[3].toUpperCase();

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    today.setHours(hours, minutes, 0, 0);
    return today;
  }

  // 2) 24-hour format without AM/PM
  const twentyFourHr = timeStr.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (twentyFourHr) {
    let hours = parseInt(twentyFourHr[1], 10);
    const minutes = parseInt(twentyFourHr[2], 10);

    // Heuristic: college afternoon periods often written as 1:xx, 2:xx, 3:xx without PM.
    // Assume any hour between 1-6 means PM.
    if (hours >= 1 && hours <= 6) {
      hours += 12;
    }

  today.setHours(hours, minutes, 0, 0);
    return today;
  }

  // Fallback – return current time so the app keeps running even on bad input
  return today;
};

// --- Main Component ---
const CurrentTimeTable = () => {
  const { user, userData } = useAuth();
  const [timetableData, setTimetableData] = useState<TimeTableDoc | null>(null);
  const [timetableVisibility, setTimetableVisibility] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, number>>({});
  const cardsContainerRef = React.useRef<HTMLDivElement>(null);
  const [api, setApi] = React.useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const isToday = selectedDay === todayName;

  useEffect(() => {
    if (!api) {
      return
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      setSelectedDay(days[selectedIndex]);
      setCurrentSlide(selectedIndex);
    };

    api.on("select", handleSelect);
    // Set initial day
    handleSelect();
    
    // Set carousel to today's date on initial load
    const dayIndex = days.indexOf(todayName);
    if (dayIndex !== -1) {
      api.scrollTo(dayIndex);
    }


    return () => {
      api.off("select", handleSelect)
    }
  }, [api, todayName])

  // Derived info for tooltip: identify current break range if not in a period
  const breakInfo = React.useMemo(() => {
    if (currentPeriodIndex !== -1 || periods.length === 0) return null;

    // Find the first period that starts after now
    for (let i = 0; i < periods.length; i++) {
      const start = parseTime(periods[i].startTime);
      if (currentTime < start) {
        const prevEnd = i > 0 ? periods[i - 1].endTime : null;
        return {
          start: prevEnd ?? '',
          end: periods[i].startTime,
        };
      }
    }

    // If after the last period
    return {
      start: periods[periods.length - 1].endTime,
      end: '',
    };
  }, [currentPeriodIndex, periods, currentTime]);

  // Effect to fetch timetable and set current day logic
  useEffect(() => {
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    //setSelectedDay(todayName); // This is now handled by the carousel's useEffect

    if (!user?.email || !userData) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'TimeTable'),
        where('department_uploaded', '==', userData.department),
        where('year_uploaded', '==', userData.year),
        where('section_uploaded', '==', userData.section),
        where('semester_uploaded', '==', userData.semester)
      ),
      (snapshot) => {
        if (snapshot.empty) {
          setTimetableData(null);
          setTimetableVisibility(false);
          setLoading(false);
          return;
        }

        const timetableDoc = snapshot.docs[0];
        const timetable = timetableDoc.data() as TimeTableDoc;

        const isVerified = timetable.hasVerified === true;
        const isAdmin = userData.CanUploadEdit === true;

        if (isVerified || isAdmin) {
          setTimetableData(timetable);
          setTimetableVisibility(true);
        } else {
          setTimetableData(null);
          setTimetableVisibility(false);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching timetable:', error);
        setTimetableData(null);
        setTimetableVisibility(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userData]);

  // Set up timer to update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Effect to update periods when day or data changes
  useEffect(() => {
    if (timetableData && selectedDay && timetableData.day[selectedDay]) {
      const dayData = timetableData.day[selectedDay];
      const fullPeriods = timetableData.PeriodandTimings.map(pt => {
        const found = dayData.find(p => p.period === pt.period);
        if (found) return found;
        const [startTime, endTime] = pt.timing.split(' - ');
        return {
          period: pt.period,
          iscode: false,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          Activity: [],
        };
      });
      setPeriods(fullPeriods);
    } else {
      setPeriods([]);
    }
  }, [selectedDay, timetableData]);

  // Utility callback to calculate progress; memoized to keep stable reference
  const calculateProgress = React.useCallback(() => {
    if (!periods.length || !cardsContainerRef.current) return;

    const containerEl = cardsContainerRef.current;
    const cards = Array.from(containerEl.children) as HTMLElement[];
    if (cards.length === 0) return;

    // 1. Determine the active period (if any)
    const activeIdx = periods.findIndex((p) => {
      const start = parseTime(p.startTime);
      const end = parseTime(p.endTime);
      return currentTime >= start && currentTime < end;
    });
    setCurrentPeriodIndex(activeIdx);

    // Helpful measurements
    const firstCardTop = cards[0].offsetTop; // y-position of the first card
    const lastCard = cards[cards.length - 1];
    const lastCardBottom = lastCard.offsetTop + lastCard.offsetHeight;
    const totalHeight = lastCardBottom - firstCardTop;

    let progressPixels = 0; // distance from top of first card

    if (activeIdx !== -1 && cards[activeIdx]) {
      // We are inside a period
      const card = cards[activeIdx];
      const cardTop = card.offsetTop;
      const cardHeight = card.offsetHeight;

      const period = periods[activeIdx];
      const start = parseTime(period.startTime);
      const end = parseTime(period.endTime);
      const duration = end.getTime() - start.getTime();
      const elapsed = currentTime.getTime() - start.getTime();
      const within = Math.max(0, Math.min(1, elapsed / duration));

      progressPixels = (cardTop - firstCardTop) + within * cardHeight;
    } else {
      // We are in a break or outside schedule
      let lastFinishedIdx = -1;
      for (let i = periods.length - 1; i >= 0; i--) {
        if (currentTime >= parseTime(periods[i].endTime)) {
          lastFinishedIdx = i;
          break;
        }
      }

      if (lastFinishedIdx !== -1 && cards[lastFinishedIdx]) {
        const finishedCard = cards[lastFinishedIdx];
        progressPixels = (finishedCard.offsetTop - firstCardTop) + finishedCard.offsetHeight;
      } else if (currentTime < parseTime(periods[0].startTime)) {
        // Before first period
        progressPixels = 0;
      } else {
        // After last period
        progressPixels = totalHeight;
      }
    }

    const relativeProgress = (progressPixels / totalHeight) * 100;
    setProgress(Math.max(0, Math.min(100, relativeProgress)));
  }, [periods, currentTime]);

  // Effect to calculate progress when time or period data changes
  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  // Recalculate when window is resized (layout changes)
  useEffect(() => {
    const handleResize = () => {
      calculateProgress();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [calculateProgress]);

  // Automatically scroll the currently active period card into view on first render
  const hasAutoScrolledRef = React.useRef(false);
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    if (currentPeriodIndex === -1) return;
    if (!cardsContainerRef.current) return;

    const cards = Array.from(cardsContainerRef.current.children) as HTMLElement[];
    const card = cards[currentPeriodIndex];
    if (card) {
      card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hasAutoScrolledRef.current = true;
    }
  }, [currentPeriodIndex]);

  const toggleExpand = (idx: number) => {
    // A card is expanded if its state is not explicitly false.
    // Toggling should set it to the opposite of its current visual state.
    const isCurrentlyExpanded = expanded[idx] !== false;
    setExpanded(prev => ({ ...prev, [idx]: !isCurrentlyExpanded }));
  };
  
  const handleOptionChange = (periodIdx: number, optIdx: number) => {
    setSelectedOption(prev => ({ ...prev, [periodIdx]: optIdx }));
  };

  if (loading) {
    return <div className='text-white'>Loading timetable...</div>;
  }

  if (!timetableVisibility || !timetableData) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 text-center">
        {userData?.CanUploadEdit===true && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Timetable Not Available</h2>
            <p className="text-white/70">You still haven't uploaded the timetable.</p>
          </>
        )}
        {userData?.CanUploadEdit===false && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Timetable Not Available</h2>
            <p className="text-white/70">Please wait for your section administrator to publish the timetable.</p>
          </>
        )}
      </div>
    );
  }


  if (!timetableData && (selectedDay !== 'Saturday' && selectedDay !== 'Sunday')) {
    return <div className='text-white'>Loading timetable... Make sure you have uploaded one.</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Static Day Display */}
      <div className="flex items-center justify-center mb-6">
        <OptionCarousel api={api} setApi={setApi} />
      </div>

      <div className="flex gap-4 lg:gap-8">
        {/* Vertical ticker for all viewports */}
        {isToday && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-12 flex-shrink-0 mb-4 lg:mb-0">
            <div className='w-full h-full'>
                  <div className="relative h-full w-[30px] bg-white/10 rounded-full overflow-hidden max-sm:-translate-x-2">
                    <div
                      className="absolute top-0 left-0 w-[30px] transition-all duration-1000 ease-out"
                    style={{ height: `${progress}%` }}
                    >
                      {/* Liquid background with gradient */}
                      <div className="absolute inset-0  bg-gradient-to-t from-[#6B7FFF] to-[#4C5FD5] to-85% rounded-full"></div>
                      
                                              {/* Animated bubbles */}
                        <div className="absolute inset-0 overflow-hidden rounded-full group">
                          {/* Large bubbles */}
                          <div className="absolute w-2 h-2 bg-white/70 rounded-full shadow-sm"
                               style={{ 
                                 left: '15%',
                                 bottom: '5%',
                                 animation: 'float 2.5s ease-in-out infinite'
                               }}></div>

                               <div className="absolute w-2 h-2 bg-white/70 rounded-full shadow-sm"
                               style={{ 
                                 left: '15%',
                                 bottom: '5%',
                                 animation: 'float 2.5s ease-in-out infinite'
                               }}></div>
                               <div className="absolute w-2 h-2 bg-white/70 rounded-full shadow-sm"
                               style={{ 
                                 left: '15%',
                                 bottom: '12%',
                                 animation: 'float 2.5s ease-in-out infinite'
                               }}></div>

                               <div className="absolute w-2 h-2 bg-white/70 rounded-full shadow-sm"
                               style={{ 
                                 left: '50%',
                                top: '39%',
                                 animation: 'float 2.5s ease-in-out infinite'
                               }}></div>

                               {/* I wanna add more bubbles */}
                               <div className="absolute w-3 h-3 bg-white/50 rounded-full shadow-sm"
                               style={{ 
                                 left: '20%',
                                 bottom: '25%',
                                 animation: 'float 2.8s ease-in-out infinite 0.5s'
                               }}></div>

                               <div className="absolute w-3 h-3 bg-white/50 rounded-full shadow-sm"
                               style={{ 
                                 left: '30%',
                                 bottom: '35%',
                                 animation: 'float 2.8s ease-in-out infinite 0.5s'
                               }}></div>

                              <div className="absolute w-3 h-3 bg-white/50 rounded-full shadow-sm"
                               style={{ 
                                 left: '40%',
                                 bottom: '45%',
                                 animation: 'float 2.8s ease-in-out infinite 0.5s'
                               }}></div>
                               
                               
                          
                          <div className="absolute w-1.5 h-1.5 bg-white/60 rounded-full shadow-sm"
                               style={{ 
                                 left: '23%',
                                 bottom: '34%',
                                 animation: 'float 2.8s ease-in-out infinite 0.5s'
                               }}></div>
                          
                          {/* Medium bubbles */}
                          <div className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                               style={{ 
                                 left: '45%',
                                 bottom: '25%', 
                                 animation: 'float 2s ease-in-out infinite 0.8s'
                               }}></div>
                               
                          {/* I wanna add more bubbles */}
                          <div className="absolute w-1 h-1 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '85%',
                                 top: '40%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-3 h-3 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '12%',
                                 top: '30%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-2 h-2 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '10%',
                                 top: '10%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>
                           <div className="absolute w-2 h-2 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '60%',
                                 top: '19%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>
                            <div className="absolute w-2 h-2 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '30%',
                                 top: '6%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                       <div className="absolute w-2 h-2 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '60%',
                                 bottom: '19%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-1 h-1 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '85%',
                                 bottom: '40%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>
                          
                          <div className="absolute w-1 h-1 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '80%',
                                 bottom: '50%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                                     
                           <div className="absolute w-1.5 h-1.5 bg-white/55 rounded-full shadow-sm"
                               style={{ 
                                 left: '20%',
                                 bottom: '1%', 
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>
                          
                          {/* Small bubbles */}
                          <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full"
                               style={{ 
                                 left: '25%',
                                 bottom: '35%',
                                 animation: 'float 1.8s ease-in-out infinite 1.5s'
                               }}></div>
                          <div className="absolute w-1 h-1 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 top: '2%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 bottom: '10%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 bottom: '50%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-1 h-1 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 top: '6%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-1 h-1 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 top: '40%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>

                          <div className="absolute w-1 h-1 bg-white/40 rounded-full"
                               style={{ 
                                 left: '30%',
                                 top: '60%',
                                 animation: 'float 2.2s ease-in-out infinite 1.2s'
                               }}></div>
                               
                               
                          <div className="absolute w-0.5 h-0.5 bg-white/45 rounded-full"
                               style={{ 
                                 left: '60%',
                                 bottom: '50%',
                                 animation: 'float 1.6s ease-in-out infinite 2s'
                               }}></div>
                               
                          <div className="absolute w-0.5 h-0.5 bg-white/35 rounded-full"
                               style={{ 
                                 left: '80%',
                                 bottom: '60%',
                                 animation: 'float 1.9s ease-in-out infinite 0.3s'
                               }}></div>
                               
                          <div className="absolute w-0.5 h-0.5 bg-white/40 rounded-full"
                               style={{ 
                                 left: '35%',
                                 bottom: '70%',
                                 animation: 'float 2.1s ease-in-out infinite 1.8s'
                               }}></div>
                          
                          {/* Liquid wave effect - responds to hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent transition-all duration-300 group-hover:via-white/20"
                               style={{ 
                                 animation: 'wave 3s ease-in-out infinite',
                                 transform: 'translateY(20%)'
                               }}></div>
                               
                          {/* Hover ripple effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                               style={{ 
                                 animation: 'ripple 1.5s ease-out infinite',
                                 transform: 'translateX(-100%)'
                               }}></div>
                        </div>
                      
                                             {/* CSS animations */}
                       <style jsx>{`
                         @keyframes float {
                           0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
                           50% { transform: translateY(-12px) scale(1.2); opacity: 1; }
                         }
                         @keyframes wave {
                           0%, 100% { transform: translateY(20%) scaleY(1); }
                           50% { transform: translateY(10%) scaleY(1.1); }
                         }
                         @keyframes ripple {
                           0% { transform: translateX(-100%) scaleX(0.5); opacity: 0; }
                           50% { transform: translateX(0%) scaleX(1); opacity: 1; }
                           100% { transform: translateX(100%) scaleX(0.5); opacity: 0; }
                         }
                         .group:hover .float {
                           animation-duration: 1.5s !important;
                         }
                       `}</style>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs lg:text-lg">
              {currentPeriodIndex !== -1 ? (
                <div className="space-y-0.5 ">
                  <div className="font-medium">Period {periods[currentPeriodIndex].period}</div>
                  {periods[currentPeriodIndex].Activity?.[0]?.courseTitle ? (
                    <div>{periods[currentPeriodIndex].Activity[0].courseTitle}</div>
                  ) : (
                    <div>Free Period</div>
                  )}
                  <div className="opacity-80 text-[10px] numeric-input lg:text-lg">
                    {periods[currentPeriodIndex].startTime} - {periods[currentPeriodIndex].endTime}
                  </div>
                </div>
              ) : breakInfo ? (
                <div className="space-y-0.5">
                  <div className="font-medium lg:text-lg text-center">Break</div>
                  <div className="opacity-80 text-[10px] numeric-input lg:text-lg ">
                    {breakInfo.start} {breakInfo.start && breakInfo.end ? ' - ' : ''} {breakInfo.end || ''}
            </div>
          </div>
              ) : (
                <span>No schedule</span>
        )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        )}

        {/* --- Period Cards --- */}
        <div className={cn("flex-1 space-y-4 pb-15 max-sm:-translate-x-4  w-[200%]", !isToday && "max-sm:translate-x-6")} ref={cardsContainerRef}>
          {periods.length > 0 ? (
            periods.map((period, idx) => {
              const isCurrent = currentPeriodIndex === idx;
              const isExpanded = expanded[idx] !== false; // Expanded by default
              const optCount = period.Activity.length;
              const optIdx = selectedOption[idx] ?? 0;
              const activity = period.Activity[optIdx];

              const cardContent = (
                <>
                  <div className="p-4 cursor-pointer" onClick={() => toggleExpand(idx)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-md sm:text-lg">Period {period.period}</span>
                          <span className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {period.startTime} - {period.endTime}</span>
                        </div>
                        
                        {optCount > 1 && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className="text-white/70">Option {optIdx + 1} of {optCount}</span>
                            {[...Array(optCount)].map((_, o) => (
                              <button
                                key={o}
                                onClick={(e) => { e.stopPropagation(); handleOptionChange(idx, o); }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${o === optIdx ? 'bg-violet-600' : 'bg-white/25'} text-white transition-all`}
                              >{o + 1}</button>
                            ))}
                          </div>
                        )}

                        {activity ? (
                          <div className="p-2 rounded border border-violet-400/50 backdrop-blur-sm break-words w-full">
                            {activity.code ? (
                              <>
                                <div className="font-medium text-md sm:text-lg break-words">{activity.code}</div>
                                {!isExpanded && (
                                  <div className="text-sm mt-1 opacity-90 break-words line-clamp-2">
                                    {activity.courseTitle}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="font-medium text-md sm:text-lg break-words">{activity.courseTitle}</div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 text-white/40">Free Period</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      </div>
                    </div>
                    {activity && isExpanded && (
                    <div className="p-4 pt-0">
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="break-words"><strong>Title:</strong> {activity.courseTitle}</div>
                          {activity.faculty && activity.faculty.length > 0 && (
                            <div className="break-words"><strong>Faculty:</strong> {activity.faculty.map(f => f.name).join(', ')}</div>
                          )}
                          {activity.code && (
                            <div className="break-words"><strong>Code:</strong> {activity.code}</div>
                          )}
                        </div>
                        </div>
                      </div>
                    )}
                </>
              );
              
              return (
                <div key={idx} className={`sm:w-[26rem] w-[20rem] z-50 -translate-x-3 transition-all duration-300 ${isToday ? 'max-sm:w-[18rem]': ''}`}>
                  {isCurrent && isToday ? (
                    <div className="relative">
                      {/* The new glowing background div */}
                      <div className="absolute -inset-1 bg-gradient-to-br from-indigo-400 via-purple-500 to-indigo-500 rounded-xl blur-xl opacity-70 animate-pulse transition-all duration-500"></div>
                      
                      {/* The more transparent foreground card */}
                      <div className="relative bg-black backdrop-blur-md rounded-lg shadow-lg shadow-indigo-500/30 border border-white/10 text-white">
                        {cardContent}
                      </div>
                    </div>
                  ) : (
                    // The standard card for non-current periods
                    <div className="bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white mb-10">
                      {cardContent}
                  </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-48 bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white sm:w-[30rem] w-[28rem]">
              <p className="text-lg">No periods scheduled for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentTimeTable;