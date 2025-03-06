"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { type SpotifyUserProfile, clearStoredTokenData, getUserProfile, isLoggedIn } from "@/lib/spotify";
import { LogOut, Music } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function Header() {
	const router = useRouter();
	const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null);
	const [isClient, setIsClient] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Set client-side flag to prevent hydration issues
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Check if user is logged in and fetch profile
	useEffect(() => {
		// Skip during server-side rendering or before client hydration
		if (!isClient) return;

		const fetchUserProfile = async () => {
			if (isLoggedIn()) {
				try {
					setIsLoading(true);
					const profile = await getUserProfile();
					setUserProfile(profile);
				} catch (error: unknown) {
					console.error("Error fetching user profile:", error);
					// Clear tokens if there's an authentication error
					const errorStr = String(error);
					if (errorStr.includes("auth") || errorStr.includes("401")) {
						clearStoredTokenData();
					}
				} finally {
					setIsLoading(false);
				}
			} else {
				// Reset user profile if not logged in
				setUserProfile(null);
				setIsLoading(false);
			}
		};

		fetchUserProfile();

		// Set up an interval to periodically check authentication status
		const intervalId = setInterval(fetchUserProfile, 5000);
		return () => clearInterval(intervalId);
	}, [isClient]); // pathname removed as it's not needed

	const handleLogout = () => {
		// Use the proper clearStoredTokenData function to remove auth data
		clearStoredTokenData();

		// Reset state
		setUserProfile(null);

		// Show success message
		toast.success("bye :(");

		// Redirect to home page
		router.push("/");
	};

	return (
		<header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur-sm">
			<div className="flex items-center gap-2">
				<Link href="/" className="flex items-center gap-2">
					<Music className="rainbow-icon h-6 w-6" />
					<h1 className="rainbow-text font-bold text-xl">rainbow playlists</h1>
				</Link>
			</div>
			<div className="flex items-center gap-4">
				{isClient && isLoading ? (
					<div className="flex items-center gap-2">
						<span className="hidden h-4 w-24 animate-pulse rounded-md bg-muted md:inline" />
						<div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
						<div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
					</div>
				) : (
					userProfile && (
						<div className="flex items-center gap-2">
							<span className="hidden text-sm md:inline">Hello, {userProfile.display_name}</span>
							{userProfile.images?.[0]?.url && (
								<img src={userProfile.images[0].url} alt={userProfile.display_name} className="h-8 w-8 rounded-full" />
							)}
							<Button variant="ghost" size="sm" onClick={handleLogout}>
								<LogOut className="mr-2 h-4 w-4" /> Logout
							</Button>
						</div>
					)
				)}
				<ThemeToggle />
			</div>
		</header>
	);
}
