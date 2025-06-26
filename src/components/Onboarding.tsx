import React from 'react'
import { Contact2 } from '@/components/ui/ui/contact-2'

export default function Onboarding() {


  return (
    <div className="h-[30vh] flex flex-col items-center justify-center">
      <Contact2 
      title="Enter your details"
      description='We need to know a few things about you to get you started'
      />
  </div>
  )
}