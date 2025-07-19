import { Textarea } from "@/components/ui/ui/textarea"
import React from "react"

export const Textarea_1 = React.forwardRef<HTMLTextAreaElement, {placeholder: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void}>(
  ({placeholder, value, onChange}, ref) => {
    return <Textarea placeholder={placeholder} value={value} onChange={onChange} />
  }
);

Textarea_1.displayName = "Textarea_1";