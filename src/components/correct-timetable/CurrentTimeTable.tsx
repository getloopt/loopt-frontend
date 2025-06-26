import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from "@/components/ui/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/ui/tooltip";
import { cn } from '@/lib/utils';

// --- Type definitions ---
interface Activity {
  code: string;
  courseTitle: string;
  room: string;
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

// --- Helper function to parse time ---
const parseTime = (timeStr: string): Date => {
  const today = new Date();
  const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return today;

  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const ampm = parts[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  today.setHours(hours, minutes, 0, 0);
  return today;
};

// --- Main Component ---
const CurrentTimeTable = () => {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [progress, setProgress] = useState(0);
  const [currentPeriodIndex, setCurrentPeriodIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Effect to load data and set up timer
  useEffect(() => {
    const storedData = localStorage.getItem('timetableData');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setTimetableData(parsedData);

      const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const todayIndex = new Date().getDay();
      const currentDayName = daysOfWeek[todayIndex];
      
      if (parsedData.day && Object.keys(parsedData.day).includes(currentDayName)) {
        setSelectedDay('Thursday');
      } else if (parsedData.day && Object.keys(parsedData.day).length > 0) {
        setSelectedDay(Object.keys(parsedData.day)[0]);
      }
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Effect to update periods when day or data changes
  useEffect(() => {
    if (timetableData && selectedDay) {
      const dayData = timetableData.day[selectedDay] || [];
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
    }
  }, [selectedDay, timetableData]);

  // Effect to calculate progress and current period
  useEffect(() => {
    if (!periods.length) return;

    const firstPeriod = periods.find(p => p.Activity.length > 0) || periods[0];
    const dayStartTime = parseTime(firstPeriod.startTime);

    // Set dayEndTime to 3:40 PM today as the 100% mark
    const dayEndTime = new Date();
    dayEndTime.setHours(15, 40, 0, 0); // 3:40 PM

    const totalDuration = dayEndTime.getTime() - dayStartTime.getTime();
    const elapsed = currentTime.getTime() - dayStartTime.getTime();
    
    const currentProgress = (elapsed / totalDuration) * 100;
    setProgress(Math.max(0, Math.min(100, currentProgress)));

    const activePeriodIndex = periods.findIndex(p => {
      const start = parseTime(p.startTime);
      const end = parseTime(p.endTime);
      return currentTime >= start && currentTime < end;
    });
    setCurrentPeriodIndex(activePeriodIndex);
  }, [currentTime, periods]);

  const toggleExpand = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const days = timetableData ? Object.keys(timetableData.day) : [];

  const handleDayChange = (direction: 'prev' | 'next') => {
    // Get today's name (e.g. "Monday", "Tuesday", etc)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    // Set selected day to today
    setSelectedDay(today);
  };

  if (!timetableData) {
    return <div className='text-white'>Loading timetable... Make sure you have uploaded one.</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      {/* Static Day Display */}
      <div className="flex items-center justify-center mb-6">
        <div className="px-6 py-2 rounded-md bg-black/30 border border-white/10">
            <h2 className="text-xl font-semibold text-white text-center">{selectedDay}</h2>
        </div>
      </div>

      <div className="lg:flex lg:gap-8">
        {/* --- Progress Ticker --- */}
        <div className="lg:w-16 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='w-full'>
                  {/* Horizontal for mobile/tablet */}
                  <div className="block lg:hidden mb-4">
                    <div className="relative h-3 w-full bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="absolute left-0 top-0 h-full bg-white transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: 'white' }}
                        />
                    </div>
                  </div>
                  {/* Vertical for desktop */}
                  <div className="hidden lg:flex justify-center h-[calc(100vh-150px)]">
                    <div className="relative h-full w-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="absolute bottom-0 w-full bg-white"
                        style={{ height: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-black text-white border-white/20">
                <p>Current Time: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* --- Period Cards --- */}
        <div className="w-full space-y-4">
          {periods.map((period, idx) => {
            const isCurrent = currentPeriodIndex === idx;
            const isExpanded = expanded[idx];
            const activity = period.Activity[0]; // Assuming one option for simplicity in this view

            return (
              <div
                key={idx}
                className={cn(
                  "bg-black/30 backdrop-blur-md rounded-lg shadow border border-white/10 text-white transition-all",
                  isCurrent && "shadow-lg shadow-cyan-400/50"
                )}
              >
                <div className="p-4" onClick={() => toggleExpand(idx)}>
                  <div className="flex justify-between items-start cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-md sm:text-lg">Period {period.period}</span>
                        <span className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {period.startTime} - {period.endTime}</span>
                      </div>
                      {activity ? (
                        <div className="p-2 rounded border border-violet-400/50 backdrop-blur-sm">
                          {activity.code && <div className="font-medium text-md sm:text-lg">{activity.code}</div>}
                          {!isExpanded && <div className="text-sm mt-1 opacity-90 truncate max-w-full">{activity.courseTitle}</div>}
                        </div>
                      ) : (
                        <div className="mt-2 text-white/40">Free Period</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                  {activity && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="space-y-2 text-sm text-gray-300">
                        <div><strong>Title:</strong> {activity.courseTitle}</div>
                        {activity.faculty && activity.faculty.length > 0 && (
                          <div><strong>Faculty:</strong> {activity.faculty.map(f => f.name).join(', ')}</div>
                        )}
                         <div><strong>Room:</strong> {activity.room}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CurrentTimeTable;