import { Toaster as Sonner } from "sonner"
import { useTheme } from "next-themes"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Fallback to "system" theme if ThemeProvider is not present
  let resolvedTheme: ToasterProps["theme"] = "system"
  try {
    // `useTheme` will throw if there is no ThemeProvider in the tree
    const themeContext = useTheme()
    if (themeContext && themeContext.theme) {
      resolvedTheme = themeContext.theme as ToasterProps["theme"]
    }
  } catch {
    // silently ignore and keep default theme
  }

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
