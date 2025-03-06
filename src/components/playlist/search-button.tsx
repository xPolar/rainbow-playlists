"use client";

import { Button } from "@/components/ui/button";

export function SearchButton() {
	return (
		<Button type="submit" onClick={() => console.log("Search clicked")}>
			Search
		</Button>
	);
}
