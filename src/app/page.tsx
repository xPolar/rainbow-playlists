"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthUrl, isLoggedIn } from "@/lib/spotify";
import { ArrowRight, Music, RefreshCw, Shuffle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		// Only check login status after client-side hydration
		if (isClient && isLoggedIn()) {
			// Show loading state before redirecting
			setIsLoading(true);
			router.push("/playlists");
		}
	}, [isClient, router]);

	const handleLoginWithSpotify = async () => {
		setIsLoading(true);
		try {
			// Get authorization URL with PKCE challenge
			const authUrl = await getAuthUrl();
			// Redirect to Spotify authorization page
			window.location.href = authUrl;
		} catch (error) {
			console.error("Error generating authorization URL:", error);
			setIsLoading(false);
		}
	};

	return (
		<div className="w-full px-6 py-12 md:px-8 md:py-20">
			<div className="mx-auto flex w-full flex-col gap-12">
				{/* Hero section */}
				<div className="mx-auto flex max-w-6xl flex-col items-center space-y-6 text-center">
					<h1 className="font-bold text-4xl tracking-tight md:text-6xl">Transform Your Spotify Playlists</h1>
					<p className="max-w-3xl text-muted-foreground text-xl">
						Create beautiful rainbow-sorted playlists based on album cover colors with just a few clicks.
					</p>
					<Button
						size="lg"
						onClick={handleLoginWithSpotify}
						disabled={isLoading}
						className="mt-4 h-auto gap-2 px-8 py-6 text-lg"
					>
						{isLoading ? (
							<>
								<RefreshCw className="mr-2 h-5 w-5 animate-spin" />
								Connecting to Spotify...
							</>
						) : (
							<>
								Connect with Spotify
								<ArrowRight className="ml-2 h-5 w-5" />
							</>
						)}
					</Button>
				</div>

				{/* How it works section */}
				<div className="w-full border-t pt-12">
					<h2 className="mb-12 text-center font-bold text-3xl">How It Works</h2>
					<div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Music className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>1. Connect Spotify</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">Login with your Spotify account to access your playlists.</p>
							</CardContent>
						</Card>
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Shuffle className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>2. Select a Playlist</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">
									Choose any playlist from your Spotify library that you want to transform.
								</p>
							</CardContent>
						</Card>
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<RefreshCw className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>3. Transform to Rainbow</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">
									We'll analyze and arrange your tracks in a beautiful rainbow pattern based on album colors.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>

				{/* Features Section */}
				<div className="w-full space-y-6 pt-8">
					<h2 className="mb-8 text-center font-bold text-3xl">Features</h2>
					<div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						<div className="rounded-lg bg-muted/50 p-6">
							<h3 className="mb-2 font-semibold text-xl">Color Analysis</h3>
							<p className="text-muted-foreground">
								Sophisticated algorithm that analyzes album art colors to create visually pleasing sequences.
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-6">
							<h3 className="mb-2 font-semibold text-xl">Spotify Integration</h3>
							<p className="text-muted-foreground">
								Seamlessly works with your existing Spotify playlists without creating duplicates.
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-6">
							<h3 className="mb-2 font-semibold text-xl">Direct Sorting</h3>
							<p className="text-muted-foreground">
								Changes are applied directly to your playlist, so you can immediately enjoy your rainbow playlist.
							</p>
						</div>
						<div className="rounded-lg bg-muted/50 p-6">
							<h3 className="mb-2 font-semibold text-xl">Simple Process</h3>
							<p className="text-muted-foreground">
								Transform any playlist with just a few clicks - no technical knowledge required.
							</p>
						</div>
					</div>
				</div>
			</div>
			<footer className="border-t py-6 text-center text-muted-foreground text-sm">
				<p>&#xa9; {new Date().getFullYear()} Rainbow Playlists. All rights reserved.</p>
			</footer>
		</div>
	);
}
