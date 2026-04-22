import { cva } from "class-variance-authority";

export const buttonVariants = cva(
    "relative group border text-foreground mx-auto text-center rounded-full transition-all duration-300 ease-in-out",
    {
        variants: {
            variant: {
                default: "bg-primary/5 hover:bg-primary/10 border-primary/20",
                solid: "bg-primary hover:bg-primary-strong text-[#003258] border-transparent transition-all duration-500",
                ghost: "border-transparent bg-transparent hover:border-white/20 hover:bg-white/5",
            },
            size: {
                default: "px-7 py-2",
                sm: "px-4 py-1",
                lg: "px-10 py-3",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
); 
