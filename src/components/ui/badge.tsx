import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
	"inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/80",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				outline: "border-border bg-transparent text-foreground hover:bg-accent",
				destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
				green: "bg-green-500/20 text-green-700 border-green-300 dark:text-green-400",
				blue: "bg-blue-500/20 text-blue-700 border-blue-300 dark:text-blue-400",
				yellow: "bg-yellow-500/20 text-yellow-700 border-yellow-300 dark:text-yellow-400",
				red: "bg-red-500/20 text-red-700 border-red-300 dark:text-red-400",
				purple: "bg-purple-500/20 text-purple-700 border-purple-300 dark:text-purple-400",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

function Badge({
	className,
	variant,
	...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
