"use client";

import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";

export function PlaylistPlayButton() {
	return (
		<Button variant="outline" size="sm" className="gap-2">
			<PlayCircle className="h-4 w-4" /> Play
		</Button>
	);
}
