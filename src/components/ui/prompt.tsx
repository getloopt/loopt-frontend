"use client"
import React, { useState } from "react"
import { Textarea } from "@/components/ui/ui/textarea"
import { Button } from "@/components/ui/ui/button"

export function PromptEditor({
  initialPrompt,
  onSave,
  error,
}: {
  initialPrompt?: string
  onSave: (newPrompt: string) => void
  error?: string
}) {
  const [value, setValue] = useState(initialPrompt || "")

  // Apply red border styling when there's an error
  const textareaClassName = error
    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
    : "border-white/20 focus:ring-indigo-500 focus:border-indigo-500"

  return (
    <div className="text-white">
      <Textarea
        placeholder="{faculty} {subject} - This period is in 10mins - Give me a notification text liner that's in the format of Subject upcoming: arrival_content- arrival_content is a funnier way of stating the faculty's arrival. Do not include the subject in arrival content in any way, just the faculty. No offensive language but you can light heartedly roast. 
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

Expected output format: Data Structures upcoming: [your creative arrival announcement]"
        value={value}
        onChange={e => setValue(e.target.value)}
        className={textareaClassName}
      />
      
      {/* Show error message if there's an error */}
      {error && (
        <p className="text-red-500 text-sm mt-2 font-proxima-nova">
          {error}
        </p>
      )}
     
      <Button className="w-full mt-10 bg-zinc-800 border-white/20 border-1 hover:bg-zinc-700 hover:cursor-pointer font-proxima-nova" onClick={() => onSave(value)}>Save Custom Prompt</Button>

     
    </div>
  )
}
