import React, { useState, useEffect, useMemo, useCallback, useRef, memo, useLayoutEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Cloud, CloudOff, RefreshCw, Bell } from 'lucide-react';
import { Progress } from "@/components/ui/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/ui/tooltip";
import { cn } from '@/lib/utils';
import { useAuth, UserData } from '@/contexts/AuthContext';
import OptionCarousel from '../optioncarousel';
import { type CarouselApi } from "@/components/ui/ui/carousel"
import { useTimetable } from "@/contexts/timetableData";
import { useNetworkStatus } from '@/hooks/use-network-status';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/config';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase-config';

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
  uid?: string;
}

interface TimeTableDoc {
  day: { [key: string]: Period[] };
  PeriodandTimings: { period: string, timing: string }[];
  classRoom: string;
  email: string;
  hasVerified?: boolean;
}

// --- Helper function to parse time (memoized) ---
const parseTimeCache = new Map<string, Date>();
const parseTime = (timeStr: string): Date => {
  if (parseTimeCache.has(timeStr)) {
    return new Date(parseTimeCache.get(timeStr)!);
  }

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
    parseTimeCache.set(timeStr, new Date(today));
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
    parseTimeCache.set(timeStr, new Date(today));
    return today;
  }

  // Fallback – return current time so the app keeps running even on bad input
  parseTimeCache.set(timeStr, new Date(today));
  return today;
};

// Memoized Period Card Component
const PeriodCard = memo(({ 
  period, 
  idx, 
  isCurrent, 
  isToday, 
  expanded, 
  selectedOption, 
  onToggleExpand, 
  onOptionChange 
}: {
  period: Period;
  idx: number;
  isCurrent: boolean;
  isToday: boolean;
  expanded: Record<string, boolean>;
  selectedOption: Record<string, number>;
  onToggleExpand: (idx: number) => void;
  onOptionChange: (periodIdx: number, optIdx: number) => void;
}) => {
  const isExpanded = expanded[idx] !== false;
  const optCount = period.Activity.length;
  const optIdx = selectedOption[idx] ?? 0;
  const activity = period.Activity[optIdx];

  const cardContent = (
    <>
      <div className="p-4 cursor-pointer" onClick={() => onToggleExpand(idx)}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-md sm:text-lg">Period {period.period}</span>
              <span className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> {period.startTime} - {period.endTime}
              </span>
            </div>
            
            {optCount > 1 && (
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className="text-white/70">Option {optIdx + 1} of {optCount}</span>
                {[...Array(optCount)].map((_, o) => (
                  <button
                    key={o}
                    onClick={(e) => { e.stopPropagation(); onOptionChange(idx, o); }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${o === optIdx ? 'bg-violet-600' : 'bg-white/25'} text-white transition-all`}
                  >
                    {o + 1}
                  </button>
                ))}
              </div>
            )}

            {activity ? (
              <div className="p-2 rounded border border-violet-400/50 backdrop-blur-sm break-words w-full transition-all duration-200 ease-in-out hover:border-violet-400/70">
                {activity.code ? (
                  <>
                    <div className="font-medium text-md sm:text-lg break-words transition-all duration-200">{activity.code}</div>
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: !isExpanded ? "auto" : 0,
                        opacity: !isExpanded ? 1 : 0
                      }}
                      transition={{ 
                        duration: 0.25, 
                        ease: "easeInOut"
                      }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="text-sm mt-1 opacity-90 break-words line-clamp-2">
                        {activity.courseTitle}
                      </div>
                    </motion.div>
                  </>
                ) : (
                  <div className="font-medium text-md sm:text-lg break-words transition-all duration-200">{activity.courseTitle}</div>
                )}
              </div>
            ) : (
              <div className="mt-2 text-white/40 transition-all duration-200">Free Period</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </div>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{ 
          height: (activity && isExpanded) ? "auto" : 0,
          opacity: (activity && isExpanded) ? 1 : 0
        }}
        transition={{ 
          duration: 0.3, 
          ease: "easeInOut",
          height: { duration: 0.3 },
          opacity: { duration: 0.2 }
        }}
        style={{ overflow: "hidden" }}
      >
        {activity && (
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
      </motion.div>
    </>
  );
  
  return (
    <div className={`sm:w-[26rem] w-[20rem] z-50 -translate-x-3 transition-all duration-300 ${isToday ? 'max-sm:w-[18rem]': ''}`}>
      {isCurrent && isToday ? (
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-br from-indigo-400 via-purple-500 to-indigo-500 rounded-xl blur-xl opacity-70 animate-pulse transition-all duration-500"></div>
          <div className="relative bg-black backdrop-blur-md rounded-lg shadow-lg shadow-indigo-500/30 border border-white/10 text-white">
            {cardContent}
          </div>
        </div>
      ) : (
        <div className="bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white mb-10">
          {cardContent}
        </div>
      )}
    </div>
  );
});

PeriodCard.displayName = 'PeriodCard';



// --- Main Component ---
const CurrentTimeTable = () => {
  const { userData } = useAuth();
  const { timetable, loading: timetableLoading, error } = useTimetable();
  const isOnline = useNetworkStatus();
  
  // Pre-computed values - Use actual current day
  const actualTodayName = useMemo(() => 
    new Date().toLocaleDateString('en-US', { weekday: 'long' }), []
  );
  
  const todayName = useMemo(() => actualTodayName, [actualTodayName]);
  const [selectedDay, setSelectedDay] = useState<string>(actualTodayName);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, number>>({});
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const hasAutoScrolledRef = useRef(false);
  const [isAnimationsReady, setIsAnimationsReady] = useState(false);

  // Add notification scheduling state
  const [scheduledNotifications, setScheduledNotifications] = useState<NodeJS.Timeout[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const isToday = selectedDay === todayName;

  // Pre-computed timetable visibility
  const timetableVisibility = useMemo(() => {
    if (!timetable) return false;
    const isVerified = timetable.hasVerified === true;
    const isAdmin = userData?.CanUploadEdit === true;
    return isVerified || isAdmin;
  }, [timetable, userData]);

  // Pre-computed periods data with memoization
  const computedPeriods = useMemo(() => {
    console.log('🔍 Computing periods for day:', selectedDay);
    console.log('🔍 Timetable data:', timetable);
    
        // For weekends, always return empty periods
    if (selectedDay === 'Saturday' || selectedDay === 'Sunday') {
      console.log('🌴 Weekend day - no periods');
      return [];
    }
    
    if (!timetable) {
      console.log('❌ No timetable data available');
      return [];
    }
    
    if (!selectedDay) {
      console.log('❌ No selected day');
      return [];
    }
    // Check if timetable has required properties for weekdays
    if (selectedDay === 'Saturday' || selectedDay === 'Sunday') {
      if (!timetable.day) {
        console.log('❌ Timetable has no day property');
        return [];
      }
      
      if (!timetable.PeriodandTimings) {
        console.log('❌ Timetable has no PeriodandTimings property'); 
        return [];
      }
    }
    if(selectedDay !== 'Saturday' && selectedDay !== 'Sunday'){
      if (!timetable.day) {
        console.log('❌ Timetable has no day property');
        return [];
      }
      if (!timetable.PeriodandTimings) {
        console.log('❌ Timetable has no PeriodandTimings property'); 
        return [];
      }
      
    }
    
    // Get day data or use empty array if day doesn't exist
    const dayData = timetable.day[selectedDay] as Period[] || [];
    console.log('✅ Day data for', selectedDay, ':', dayData);
    
    return timetable.PeriodandTimings.map(pt => {
      const found = dayData.find(p => p.period === pt.period);
      if (found) return found;
      
      // Parse timing safely
      const timingParts = pt.timing ? pt.timing.split(' - ') : ['', ''];
      const [startTime, endTime] = timingParts;
      
      return {
        period: pt.period,
        iscode: false,
        startTime: startTime ? startTime.trim() : '',
        endTime: endTime ? endTime.trim() : '',
        Activity: [],
      };
    });
  }, [selectedDay, timetable]);

  // Update periods with pre-computed data
  useEffect(() => {
    setPeriods(computedPeriods);
  }, [computedPeriods]);

  // Defer animations until after initial render
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsAnimationsReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Carousel setup
  useEffect(() => {
    if (!api) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const handleSelect = () => {
      const selectedIndex = api.selectedScrollSnap();
      setSelectedDay(days[selectedIndex]);
      setCurrentSlide(selectedIndex);
    };

    api.on("select", handleSelect);
    const dayIndex = days.indexOf(todayName);
    if (dayIndex !== -1) api.scrollTo(dayIndex);

    return () => {
      api.off("select", handleSelect);
    };
  }, [api, todayName]);

  // Pre-computed break info
  const breakInfo = useMemo(() => {
    if (currentPeriodIndex !== -1 || periods.length === 0) return null;

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

    return {
      start: periods[periods.length - 1].endTime,
      end: '',
    };
  }, [currentPeriodIndex, periods, currentTime]);

  // Optimized progress calculation - only runs when necessary
  const calculateProgress = useCallback(() => {
    if (!periods.length || !cardsContainerRef.current) return;

    // Use requestAnimationFrame for smooth DOM queries
    requestAnimationFrame(() => {
      // Extra safety check - ensure element is still in DOM
      const containerEl = cardsContainerRef.current;
      if (!containerEl || !containerEl.children || !containerEl.isConnected) return;
      
      const cards = Array.from(containerEl.children) as HTMLElement[];
      if (cards.length === 0) return;

      // Find active period
      const activeIdx = periods.findIndex((p) => {
        const start = parseTime(p.startTime);
        const end = parseTime(p.endTime);
        return currentTime >= start && currentTime < end;
      });
      
      setCurrentPeriodIndex(activeIdx);

      // Calculate progress
      const firstCardTop = cards[0].offsetTop;
      const lastCard = cards[cards.length - 1];
      const lastCardBottom = lastCard.offsetTop + lastCard.offsetHeight;
      const totalHeight = lastCardBottom - firstCardTop;

      let progressPixels = 0;

      if (activeIdx !== -1 && cards[activeIdx]) {
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
          progressPixels = 0;
        } else {
          progressPixels = totalHeight;
        }
      }

      const relativeProgress = (progressPixels / totalHeight) * 100;
      setProgress(Math.max(0, Math.min(100, relativeProgress)));
    });
  }, [periods, currentTime]);

  // Debounced progress calculation
  useEffect(() => {
    const timeoutId = setTimeout(calculateProgress, 50);
    return () => clearTimeout(timeoutId);
  }, [calculateProgress]);

  // Debounced resize handler
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(calculateProgress, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateProgress]);

  // Optimized auto-scroll
  useEffect(() => {
    if (hasAutoScrolledRef.current || !cardsContainerRef.current) return;

    const timer = setTimeout(() => {
      // Double-check the ref is still valid when timeout executes
      if (!cardsContainerRef.current || !cardsContainerRef.current.children || !cardsContainerRef.current.isConnected) return;
      
      const cards = Array.from(cardsContainerRef.current.children) as HTMLElement[];
      
      // If we're in a period, scroll to that period
      if (currentPeriodIndex !== -1) {
        const card = cards[currentPeriodIndex];
        if (card) {
          card.scrollIntoView({ block: 'center', behavior: 'smooth' });
          hasAutoScrolledRef.current = true;
        }
        return;
      }

      // If we're in a break, find and scroll to the next period
      for (let i = 0; i < periods.length; i++) {
        const start = parseTime(periods[i].startTime);
        if (currentTime < start) {
          const card = cards[i];
          if (card) {
            card.scrollIntoView({ block: 'center', behavior: 'smooth' });
            hasAutoScrolledRef.current = true;
          }
          break;
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPeriodIndex, periods, currentTime]);

  // Memoized event handlers
  const toggleExpand = useCallback((idx: number) => {
    const isCurrentlyExpanded = expanded[idx] !== false;
    setExpanded(prev => ({ ...prev, [idx]: !isCurrentlyExpanded }));
  }, [expanded]);
  
  const handleOptionChange = useCallback((periodIdx: number, optIdx: number) => {
    setSelectedOption(prev => ({ ...prev, [periodIdx]: optIdx }));
  }, []);

  // Time update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Add page visibility change listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(timer);
      } else {
        // Restart timer when page becomes visible
        setCurrentTime(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);


  // Add notification status indicator
  const NotificationStatus = () => {
    if (selectedDay === 'Saturday' || selectedDay === 'Sunday') return null;
    if (selectedDay !== todayName) return null;
    if (!userData || !('uid' in userData)) return null;

    // These functions (getStatusColor and getStatusText) are not being used anywhere,
    // so we can safely remove them to clean up the code.
  };

  // Early returns for loading states
  if (timetableLoading) {
    return <div className='text-white'>Loading timetable...</div>;
  }

  // Check for weekend offline scenario
  if (!isOnline && !timetable && (actualTodayName === 'Saturday' || actualTodayName === 'Sunday')) {
    return (
      <div className="w-full max-w-5xl p-4 text-center translate-x-10 justify-center items-center">
        <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">🌴 It's {actualTodayName}!</h2>
          <p className="text-white/80 text-lg mb-2">Enjoy your weekend!</p>
          <p className="text-blue-300 text-sm">No classes scheduled for weekends</p>
          
          <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
            <p className="text-orange-300 text-sm flex items-center justify-center gap-2">
              📱 <span>Offline Mode: Connect to internet for latest updates</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ((!timetableVisibility || !timetable) && selectedDay !== 'Saturday' && selectedDay !== 'Sunday') {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 text-center">
        {userData?.CanUploadEdit === true && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Timetable Not Available</h2>
            <p className="text-white/70">You still haven't uploaded the timetable.</p>
          </>
        )}
        {userData?.CanUploadEdit === false && (
          <>
            <h2 className="text-2xl font-bold text-white mb-2">Timetable Not Available</h2>
            <p className="text-white/70">Please wait for your section administrator to publish the timetable.</p>
          </>
        )}
      </div>
    );
  }

  // Handle no timetable for weekdays only
  if (!timetable && selectedDay !== 'Saturday' && selectedDay !== 'Sunday') {
    return <div className='text-white'>Loading timetable... Make sure you have uploaded one.</div>;
  }

  // Additional safety check for malformed timetable data (skip for weekends)
  if (timetable && (!timetable.day || !timetable.PeriodandTimings) && selectedDay !== 'Saturday' && selectedDay !== 'Sunday') {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Timetable Data Error</h2>
        <p className="text-white/70">The timetable data appears to be corrupted. Please contact your administrator.</p>
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">
            Missing: {!timetable.day ? 'day data' : ''} {!timetable.PeriodandTimings ? 'period timings' : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Add notification status */}
      <NotificationStatus />
      
      {/* Static Day Display */}
      <div className="flex items-center justify-center mb-6">
        <OptionCarousel api={api} setApi={setApi} />
      </div>

      <div className="flex gap-4 lg:gap-8">
        {/* Vertical ticker - only render when animations are ready */}
        {isToday && isAnimationsReady && selectedDay !== 'Saturday' && selectedDay !== 'Sunday' && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-12 flex-shrink-0 mb-4 lg:mb-0">
                  <div className='w-full h-full'>
                    <div className="relative h-full w-[30px] bg-white/10 rounded-full overflow-hidden max-sm:-translate-x-2">
                      <motion.div
                        className="absolute top-0 left-0 w-[30px]"
                        initial={{ height: "0%" }}
                        animate={{ height: `${progress}%` }}
                        transition={{
                          type: "spring",
                          stiffness: 60,
                          damping: 20,
                          mass: 1
                        }}
                      >
                      
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-t from-[#6B7FFF] to-[#4C5FD5] to-85% rounded-full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                        <div className="absolute inset-0 overflow-hidden rounded-full group">
                          <motion.div 
                            className="absolute w-2 h-2 bg-white/70 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              bottom: '15%',
                              animation: 'float 2.5s ease-in-out infinite'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/60 rounded-full shadow-sm"
                            style={{ 
                              left: '60%',
                              bottom: '40%',
                              animation: 'float 2.2s ease-in-out infinite 0.8s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '35%',
                              bottom: '70%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '35%',
                              bottom: '70%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '35%',
                              bottom: '70%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '35%',
                              bottom: '70%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                    
                          />
                          <motion.div 
                            className="absolute w-2 h-2 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              bottom: '50%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-2 h-2 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              top: '20%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-2 h-2 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '10%',
                              top: '2%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1 h-1 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '5%',
                              top: '1%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              top: '13%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              top: '25%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '20%',
                              bottom: '25%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '30%',
                              bottom: '2%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <motion.div 
                            className="absolute w-1.5 h-1.5 bg-white/50 rounded-full shadow-sm"
                            style={{ 
                              left: '30%',
                              bottom: '40%',
                              animation: 'float 2.1s ease-in-out infinite 1.5s'
                            }}
                          />
                          <style jsx>{`
                            @keyframes float {
                              0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
                              50% { transform: translateY(-8px) scale(1.1); opacity: 1; }
                            }
                          `}</style>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs lg:text-lg">
                {currentPeriodIndex !== -1 ? (
                  <div className="space-y-0.5">
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
                    <div className="opacity-80 text-[10px] numeric-input lg:text-lg">
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

        {/* Period Cards */}
        <div className={cn("flex-1 space-y-4 pb-15 max-sm:-translate-x-4 w-[200%]", !isToday && "max-sm:translate-x-6")} ref={cardsContainerRef}>
          {selectedDay === 'Saturday' || selectedDay === 'Sunday' ? (
            <div className={cn("flex items-center justify-center", selectedDay === 'Sunday' ? 'max-sm:-translate-x-5' : 'max-sm:translate-x-3')}>
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6 max-w-md">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">🌴 It's {selectedDay}!</h2>
                <p className="text-white/80 text-lg mb-2 text-center">Enjoy your weekend!</p>
                <p className="text-blue-300 text-sm text-center">No classes scheduled for weekends</p>
                
                {!isOnline && (
                  <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
                    <p className="text-orange-300 text-sm flex items-center justify-center gap-2">
                      📱 <span>Offline Mode: Connect to internet for latest updates</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : periods.length > 0 ? (
            periods.map((period, idx) => {
              const isCurrent = currentPeriodIndex === idx;
              return (
                <PeriodCard
                  key={`${selectedDay}-${period.period}-${idx}`}
                  period={period}
                  idx={idx}
                  isCurrent={isCurrent}
                  isToday={isToday}
                  expanded={expanded}
                  selectedOption={selectedOption}
                  onToggleExpand={toggleExpand}
                  onOptionChange={handleOptionChange}
                />
              );
            })
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-lg text-white">No periods scheduled for today.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentTimeTable;