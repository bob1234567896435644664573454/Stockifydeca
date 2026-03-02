import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
        return (
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    className="peer h-4 w-4 opacity-0 absolute inset-0 cursor-pointer z-10"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => {
                        onCheckedChange?.(e.target.checked)
                        onChange?.(e)
                    }}
                    {...props}
                />
                <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary text-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-primary text-primary-foreground" : "bg-transparent",
                    className
                )}>
                    {checked && <Check className="h-3 w-3" />}
                </div>
            </div>
        )
    }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
