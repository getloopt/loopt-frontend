import React, { useEffect, useState } from 'react'
import sampleTable from '../../../data/sampletable'
import OptionCarousel from '../optioncarousel'
import { type CarouselApi } from "@/components/ui/ui/carousel";
import DaySchedule from './DaySchedule';
import FormTimetable from './Form-timetable';
import { Button } from '../ui/ui/button';
import { useAuth } from '@/contexts/AuthContext';



type DayKey = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
const dayMap: Record<number, DayKey> = {
  2: 'Monday',
  3: 'Tuesday',
  4: 'Wednesday',
  5: 'Thursday',
  6: 'Friday'
};


export default function EditWeekSchedule() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const {logout } = useAuth();


  useEffect(() => {
    if (!api) return;
    // initial
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const selectedDay = dayMap[current];
  return (
    <div>
         <div className="fixed top-4 right-8 z-50 flex items-center">
            <Button
              className=" button-logout border-white/20 border-1 font-proxima-nova"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
    <div className="flex flex-col w-full px-4 md:px-10 lg:px-20 mt-18">
     
      <OptionCarousel setApi={setApi} api={api} />

      {/* Timetable-info slide (index 1) */}
      <div
        className={`mt-4 w-full max-w-2xl sm:overflow-y-auto overflow-auto scroll-smooth pb-30 sm:h-[90vh] xl:translate-x-35 xl:translate-y-1 sm:translate-x-30 md:-translate-x-3 lg:translate-x-10 ${current === 1 ? '' : 'hidden'}`}
      >
        <FormTimetable />
      </div>

      {/* Day schedule slides */}
      {selectedDay && (
        <div
          className={`mt-4 w-full max-w-2xl mx-auto sm:overflow-y-auto overflow-auto scroll-smooth pb-30 sm:h-[90vh] xl:translate-x-50 lg:translate-x-10 md:translate-x-10 sm:translate-x-24 ${current !== 1 ? '' : 'hidden'}`}
        >
          <DaySchedule day={selectedDay} />
        </div>
      )}
    </div>
    </div>
  )
}