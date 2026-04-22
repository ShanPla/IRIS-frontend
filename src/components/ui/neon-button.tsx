import React from "react";
import { cn } from "../../lib/utils";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button-variants";

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { neon?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, neon = true, size, variant, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            >
                {/* Top Neon Line */}
                <span className={cn(
                    "absolute h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out inset-x-0 inset-y-0 bg-gradient-to-r w-3/4 mx-auto from-transparent via-primary to-transparent hidden", 
                    neon && "block"
                )} />
                
                {children}
                
                {/* Bottom Neon Line */}
                <span className={cn(
                    "absolute group-hover:opacity-50 transition-opacity duration-700 ease-in-out inset-x-0 h-px -bottom-px bg-gradient-to-r w-3/4 mx-auto from-transparent via-primary to-transparent hidden", 
                    neon && "block"
                )} />
                {/* Smooth Hover Glow Background */}
                <span className={cn(
                    "absolute inset-0 rounded-full bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm",
                    neon && "block"
                )} />
            </button>
        );
    }
)

Button.displayName = "Button";

export { Button };
