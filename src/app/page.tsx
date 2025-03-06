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
					<h1 className="font-bold text-4xl tracking-tight md:text-6xl">make rainbow playlists</h1>
					<p className="max-w-3xl text-muted-foreground text-xl">
						my friend has all her playlists manually organized to be rainbow so i made this tool for her
					</p>
					<Button
						size="lg"
						onClick={handleLoginWithSpotify}
						disabled={isLoading}
						className="mt-4 h-auto gap-2 px-8 py-3 text-lg"
					>
						{isLoading ? (
							<>
								<RefreshCw className="mr-2 h-5 w-5 animate-spin" />
								connecting to spotify...
							</>
						) : (
							<>
								connect with spotify
								<ArrowRight className="ml-2 h-5 w-5" />
							</>
						)}
					</Button>
				</div>

				{/* How it works section */}
				<div className="w-full pt-12">
					<h2 className="mb-12 text-center font-bold text-3xl">How It Works</h2>
					<div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Music className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>1. connect spotify</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">login.</p>
							</CardContent>
						</Card>
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<Shuffle className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>2. select a playlist</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">if you don't have any i'm disappointed in you.</p>
							</CardContent>
						</Card>
						<Card className="border-none shadow-md">
							<CardHeader>
								<div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
									<RefreshCw className="h-6 w-6 text-primary" />
								</div>
								<CardTitle>3. make it rainbow</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-muted-foreground">click the button. maybe re-order the tracks, or don't.</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
