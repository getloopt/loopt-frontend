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

  // This function validates placeholders in the text
  // It only checks for {faculty} and {subject} placeholders, ignoring other brackets like [your creative arrival announcement]
  function validatePlaceholders(text: string): {
    valid: string[];
    invalid: string[];
  } {
    // 1. Only these exact tokens are valid:
    const allowed = ['{faculty}', '{subject}'];

    // Use Sets to avoid duplicates
    const validSet = new Set<string>();
    const invalidSet = new Set<string>();

    // 2. Detect double‑brace patterns: "{{…}}", "{{…}", "{…}}"
    const doubleCurly = text.match(/\{\{[^}]*\}\}|\{\{[^}]*\}|[^}]*\}\}/g) || [];
    doubleCurly.forEach(tok => {
      // Only invalidate those that mention faculty/subject
      if (/faculty|subject/i.test(tok)) {
        invalidSet.add(tok);
      }
    });

    // 3. Now capture *single* curly tokens that are NOT part of the double‑brace
    //    Negative lookbehind (?<!\{) ensures we don't pick the inner "{faculty}" in "{{faculty}}"
    //    Negative lookahead  (?!\}) ensures we don't pick it before the ending "}}"
    const curlyTokens = text.match(/(?<!\{)\{[^}]*\}(?!\})/g) || [];

    // 4. Mismatched‑bracket tokens like "{faculty)" or "(subject}"
    const mismatchTokens = text.match(/(\{[^)]*\)|\([^}]*\})/g) || [];

    // 5. Other brackets […] or (…) that might mention faculty/subject
    const otherTokens = text.match(/[\[\(][^\]\)]*[\]\)]/g) || [];

    // 6. Empty brackets like {}, [], or ()
    const emptyBrackets = text.match(/\{\}|\[\]|\(\)/g) || [];

    // 7. Check for mismatched start/end brackets - any bracket that starts with one type and ends with another
    const mismatchedStartEnd = text.match(/([\[\(][^\]\)\}]*[\]\)\}]|\{[^\]\)\}]*[\]\)])/g) || [];
    // This regex finds bracket patterns that have mismatched start/end
    // For example: (sub}, [faculty), {subject] - but NOT {faculty} or {subject}

    // 6. Process all single‑curly tokens
    curlyTokens.forEach(token => {
      // normalize inner text
      const inner = token.slice(1, -1).trim().toLowerCase();

      if (allowed.includes(token.toLowerCase())) {
        // exactly "{faculty}" or "{subject}"
        validSet.add(token);
      }
      else if (/faculty|subject/.test(inner)) {
        // mentions faculty/subject but isn't exactly the allowed form
        invalidSet.add(token);
      }
      // Check for common typos and abbreviations
      else if (/^fac$|^faculty$|^f$|^facul$|^facult$/.test(inner)) {
        // Common typos for faculty
        invalidSet.add(token);
      }
      else if (/^subj$|^subject$|^s$|^sub$|^subje$|^subjec$/.test(inner)) {
        // Common typos for subject
        invalidSet.add(token);
      }
      // Check for more flexible faculty/subject variations
      else if (/^fac.*$/.test(inner) && inner !== 'faculty') {
        // Starts with 'fac' but isn't exactly 'faculty' (like 'fac', 'facc', 'facultyy', etc.)
        invalidSet.add(token);
      }
      else if (/^sub.*$/.test(inner) && inner !== 'subject') {
        // Starts with 'sub' but isn't exactly 'subject' (like 'sub', 'subb', 'subjeccc', etc.)
        invalidSet.add(token);
      }
      // Check for single letter and two letter abbreviations
      else if (/^s$/.test(inner)) {
        // Single 's' - likely meant 'subject'
        invalidSet.add(token);
      }
      else if (/^su$/.test(inner)) {
        // 'su' - likely meant 'subject'
        invalidSet.add(token);
      }
      else if (/^f$/.test(inner)) {
        // Single 'f' - likely meant 'faculty'
        invalidSet.add(token);
      }
      else if (/^fa$/.test(inner)) {
        // 'fa' - likely meant 'faculty'
        invalidSet.add(token);
      }
      // else: some other {foo} → ignore
    });

    // 7. Anything in mismatchTokens that mentions faculty/subject is invalid
    mismatchTokens.forEach(token => {
      if (/faculty|subject/i.test(token)) {
        invalidSet.add(token);
      }
    });

    // 8. Same for other bracket types
    otherTokens.forEach(token => {
      if (/faculty|subject/i.test(token)) {
        invalidSet.add(token);
      }
    });

    // 9. Handle empty brackets - these are always invalid
    emptyBrackets.forEach(token => {
      invalidSet.add(token);
    });

    // 10. Handle mismatched start/end brackets that contain faculty/subject
    mismatchedStartEnd.forEach(token => {
      const inner = token.slice(1, -1).trim().toLowerCase();
      if (/faculty|subject/i.test(inner)) {
        invalidSet.add(token);
      }
    });

    return {
      valid:   Array.from(validSet),
      invalid: Array.from(invalidSet),
    };
  }

  // Use the validation function to check the current value
  const placeholderValidation = useMemo(() => {
    const result = validatePlaceholders(value);
    
    // Add suggestions for common typos
    const suggestions: string[] = [];
    result.invalid.forEach(invalid => {
      const inner = invalid.slice(1, -1).trim().toLowerCase();
      
      // Handle empty brackets
      if (invalid === '{}' || invalid === '[]' || invalid === '()') {
        suggestions.push('{faculty}', '{subject}');
      }
      // Handle mismatched brackets that contain faculty/subject keywords
      else if (/faculty|subject/i.test(inner)) {
        if (/faculty/i.test(inner)) {
          suggestions.push('{faculty}');
        }
        if (/subject/i.test(inner)) {
          suggestions.push('{subject}');
        }
      }
      // Handle mismatched start/end brackets specifically
      else if (invalid.match(/^[\[\(][^\]\)]*[\]\)\}]$/) && /faculty|subject/i.test(inner)) {
        // This is a mismatched start/end bracket containing faculty/subject
        if (/faculty/i.test(inner)) {
          suggestions.push('{faculty}');
        }
        if (/subject/i.test(inner)) {
          suggestions.push('{subject}');
        }
      }
      // Suggest corrections for faculty typos
      else if (/^fac$|^faculty$|^f$|^facul$|^facult$/.test(inner)) {
        suggestions.push('{faculty}');
      }
      // Suggest corrections for subject typos
      else if (/^subj$|^subject$|^s$|^sub$|^subje$|^subjec$/.test(inner)) {
        suggestions.push('{subject}');
      }
      // Suggest corrections for flexible faculty/subject variations
      else if (/^fac.*$/.test(inner) && inner !== 'faculty') {
        suggestions.push('{faculty}');
      }
      else if (/^sub.*$/.test(inner) && inner !== 'subject') {
        suggestions.push('{subject}');
      }
      // Suggest corrections for single letter and two letter abbreviations
      else if (/^s$/.test(inner)) {
        suggestions.push('{subject}');
      }
      else if (/^su$/.test(inner)) {
        suggestions.push('{subject}');
      }
      else if (/^f$/.test(inner)) {
        suggestions.push('{faculty}');
      }
      else if (/^fa$/.test(inner)) {
        suggestions.push('{faculty}');
      }
      // Suggest corrections for other faculty/subject variations
      else if (/faculty/.test(inner)) {
        suggestions.push('{faculty}');
      }
      else if (/subject/.test(inner)) {
        suggestions.push('{subject}');
      }
    });
    
    return {
      ...result,
      suggestions: [...new Set(suggestions)] // Remove duplicates
    };
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
          
          {/* Show suggestions for corrections */}
          {placeholderValidation.suggestions && placeholderValidation.suggestions.length > 0 && (
            <div className="mb-2">
              <span className="text-yellow-400 text-sm font-proxima-nova">💡 Did you mean: </span>
              {placeholderValidation.suggestions.map((suggestion, index) => (
                <span key={index} className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-sm font-mono mr-2">
                  {suggestion}
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
