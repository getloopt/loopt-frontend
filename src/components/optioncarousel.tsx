import React from 'react'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from "@/components/ui/ui/carousel"
import { type CarouselApi } from "@/components/ui/ui/carousel"

interface OptionCarouselProps {
    setApi: (api: CarouselApi) => void;
}

const OptionCarousel: React.FC<OptionCarouselProps> = ({ setApi }) => {
  return (
    <Carousel setApi={setApi} className='sm:w-[300px] sm:h-[50px] w-[210px] h-[50px] bg-white/17 border-1 rounded-lg border-white/17 md:translate-x-30 lg:translate-x-43 max-sm:translate-x-30 sm:translate-x-40 xl:translate-x-70'>
  <CarouselContent>
    <CarouselItem>
        <div>
        <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Timetable Information</h1>
        </div>
    </CarouselItem>
    <CarouselItem>
        <div>
            <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Monday</h1>
        </div>
    </CarouselItem>
    <CarouselItem>
        <div>
            <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Tuesday</h1>
        </div>
    </CarouselItem>
    <CarouselItem>
        <div>
            <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Wednesday</h1>
        </div>
    </CarouselItem>
    <CarouselItem>
        <div>
            <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Thursday</h1>
        </div>
    </CarouselItem>
    <CarouselItem>
        <div>
            <h1 className='text-white text-lg md:text-xl  text-center mt-2 font-sans font-medium'>Friday</h1>
        </div>
    </CarouselItem>
  
  </CarouselContent>
  <CarouselPrevious className="bg-[#141415] rounded-full border-1 border-white/17 p-2 hover:bg-[#141415] hover:border-white/17 hover:text-white"/>
  <CarouselNext className="bg-[#141415] rounded-full border-1 border-white/17 p-2 hover:bg-[#141415] hover:border-white/17 hover:text-white"/>
</Carousel>
  )
}

export default OptionCarousel