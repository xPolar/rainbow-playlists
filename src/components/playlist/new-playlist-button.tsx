"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function NewPlaylistButton() {
	return (
		<Button onClick={() => toast.success("This is a toast notification!")} className="gap-2">
			<Plus className="h-4 w-4" /> New Playlist
		</Button>
	);
}
