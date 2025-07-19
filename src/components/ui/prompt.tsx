"use client"
import React, { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/ui/textarea"
import { Button } from "@/components/ui/ui/button"
import { useAuth } from "@/contexts/AuthContext"

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
  const { userData } = useAuth()
  // Update the value when initialPrompt changes
  React.useEffect(() => {
    if (userData?.customNotificationPrompt !== undefined) {
      setValue(userData.customNotificationPrompt)
    }
  }, [userData?.customNotificationPrompt])

  // This function checks what placeholders the user is typing and gives feedback.
  // It only checks for {faculty} and {subject} placeholders, not for anything else like [your creative arrival announcement].
  // It also tries to auto-correct some common mistakes for beginners.
  const placeholderValidation = useMemo(() => {
    // The only valid placeholders are these, and they must be lowercase, no spaces, and use curly braces
    const validPlaceholders = ['{faculty}', '{subject}'];

    // We'll use this to collect the results
    const validation = {
      valid: [] as string[],
      invalid: [] as string[],
      suggestions: [] as string[],
      errors: [] as string[]
    };

    // 1. Find all things that look like placeholders (anything inside any kind of brackets)
    // We'll look for curly braces, but also check for other brackets and common mistakes
    // This regex finds anything that starts with a bracket and ends with a bracket, including wrong ones
    const anyBracketPattern = /(\{[^}]*\}|[\[\(][^\]\)]*[\]\)])/g;
    const foundPlaceholders = value.match(anyBracketPattern) || [];

    // 2. We'll also check for unclosed curly braces (e.g. "{faculty" or "{subject ")
    // This regex finds a "{" that is not closed by a "}"
    const unclosedCurlyPattern = /\{[^\}]*$/g;
    const unclosedCurly = value.match(unclosedCurlyPattern) || [];

    // 3. We used to check for wrong brackets like [faculty] or (subject), but now we skip this check
    // because sometimes the user might use square brackets or other types of brackets for things
    // that are NOT placeholders (for example, [your creative arrival announcement]).
    // So, we do NOT check for wrong brackets here anymore.
    // However, we DO check for wrong brackets if they contain "faculty" or "subject" keywords
    // since those are likely meant to be placeholders

    // 4. We'll check for spaces before the closing curly brace, and auto-correct them
    // For example: "{faculty }" should become "{faculty}"
    let autoCorrectedValue = value.replace(/\{(\w+)\s+\}/g, (match, p1) => `{${p1}}`);

    // 5. Now, let's process each found placeholder
    foundPlaceholders.forEach(placeholder => {
      // Check if it contains faculty or subject keywords but uses wrong brackets
      const inside = placeholder.replace(/^[\[\(]|[\]\)]$/g, '').trim().toLowerCase();
      if ((inside === 'faculty' || inside === 'subject') && !placeholder.startsWith('{')) {
        // If it contains faculty or subject but uses wrong brackets, mark as invalid
        validation.invalid.push(placeholder);
        validation.errors.push(
          `Placeholder "${placeholder}" uses the wrong type of brackets. Use curly braces: { } only.`
        );
        // Suggest the curly-brace version
        validation.suggestions.push(`{${inside}}`);
        return;
      }

      // Only check for {faculty} and {subject} placeholders, ignore others like [your creative arrival announcement]
      // Only process if it starts with '{'
      if (!placeholder.startsWith('{')) {
        // If it starts with [ or (, it's a wrong bracket but not for faculty/subject keywords
        // So we ignore it (could be something like [your creative arrival announcement])
        return;
      }

      // Remove spaces before the closing curly brace for checking
      let cleaned = placeholder.replace(/\s+\}/, '}');

      // Only check for {faculty} and {subject}
      const cleanedName = cleaned.replace(/[{}]/g, '').trim().toLowerCase();
      if (cleanedName !== 'faculty' && cleanedName !== 'subject') {
        // Ignore anything that's not {faculty} or {subject}
        return;
      }

      // Check for uppercase letters (should be all lowercase)
      if (/[A-Z]/.test(cleaned)) {
        validation.invalid.push(placeholder);
        validation.errors.push(
          `Placeholder "${placeholder}" has uppercase letters. Use only lowercase, like "{faculty}".`
        );
        // Suggest the lowercase version
        validation.suggestions.push(cleaned.toLowerCase());
        return;
      }

      // Check for extra spaces before the closing brace
      if (/\s+\}/.test(placeholder)) {
        validation.invalid.push(placeholder);
        validation.errors.push(
          `Placeholder "${placeholder}" has a space before the closing brace. It should be like "{faculty}".`
        );
        // Suggest the corrected version
        validation.suggestions.push(cleaned);
        return;
      }

      // Check for spelling mistakes (should be exactly "{faculty}" or "{subject}")
      if (!validPlaceholders.includes(cleaned)) {
        validation.invalid.push(placeholder);
        validation.errors.push(
          `Placeholder "${placeholder}" is not recognized. Use "{faculty}" or "{subject}".`
        );
        // Suggest the closest valid placeholder if possible
        if (cleanedName.includes('faculty')) {
          validation.suggestions.push('{faculty}');
        } else if (cleanedName.includes('subject')) {
          validation.suggestions.push('{subject}');
        }
        return;
      }

      // If it passes all checks, it's valid!
      validation.valid.push(cleaned);
    });

    // 6. Handle unclosed curly braces, but only if they look like {faculty or {subject
    if (unclosedCurly.length > 0) {
      unclosedCurly.forEach(bad => {
        const cleanedName = bad.replace(/[{}]/g, '').trim().toLowerCase();
        if (cleanedName === 'faculty' || cleanedName === 'subject') {
          validation.invalid.push(bad);
          validation.errors.push(
            `Placeholder "${bad}" is missing a closing curly brace "}".`
          );
          // Suggest the closed version
          validation.suggestions.push(bad + '}');
        }
      });
    }

    // 7. If we auto-corrected the value, update it (this is optional, but helps beginners)
    if (autoCorrectedValue !== value) {
      setTimeout(() => {
        // Only update if the value hasn't changed since we started
        if (autoCorrectedValue !== value) return;
        // Uncomment the next line if you want auto-correction to happen live
        // setValue(autoCorrectedValue);
      }, 100);
    }

    return validation;
  }, [value]);

  // Apply red border styling when there's an error
  const textareaClassName = error
    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
    : "border-white/20 focus:ring-indigo-500 focus:border-indigo-500"

  return (
    <div className="text-white">
      <Textarea
        maxLength={500}
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
      
      {/* Show validation feedback */}
      {(placeholderValidation.valid.length > 0 || placeholderValidation.invalid.length > 0) && (
        <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-white/10">
          <h4 className="text-sm font-medium mb-2 font-proxima-nova">Placeholder Validation:</h4>
          
          {/* Show valid placeholders in green */}
          {placeholderValidation.valid.length > 0 && (
            <div className="mb-2">
              <span className="text-green-400 text-sm font-proxima-nova">✓ Valid placeholders: </span>
              {placeholderValidation.valid.map((placeholder, index) => (
                <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-sm font-mono mr-2">
                  {placeholder}
                </span>
              ))}
            </div>
          )}
          
          {/* Show invalid placeholders in red */}
          {placeholderValidation.invalid.length > 0 && (
            <div className="mb-2">
              <span className="text-red-400 text-sm font-proxima-nova">✗ Invalid placeholders: </span>
              {placeholderValidation.invalid.map((placeholder, index) => (
                <span key={index} className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-sm font-mono mr-2">
                  {placeholder}
                </span>
              ))}
            </div>
          )}
          
        </div>
      )}
      
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
