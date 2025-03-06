"use client";

import { Button } from "@/components/ui/button";
import { exchangeCodeForToken, getStoredState } from "@/lib/spotify";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CallbackContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [_isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const handleCallback = async () => {
			console.log("Processing callback from Spotify...");

			const code = searchParams.get("code");
			const state = searchParams.get("state");
			const storedState = getStoredState();
			const hasError = searchParams.get("error");

			// Keep isLoading true while we process - shows skeleton UI

			if (hasError) {
				console.error("Auth error from Spotify:", hasError);
				setError(`Authentication failed: ${hasError}`);
				setIsLoading(false);
				return;
			}

			if (!code) {
				console.error("No authorization code found in URL");
				setError("No authorization code found in the callback URL");
				setIsLoading(false);
				return;
			}

			console.log("Received auth code:", `${code.substring(0, 5)}...`);

			if (state !== storedState) {
				console.error("State mismatch", { received: state, stored: storedState });
				setError("State mismatch. Possible CSRF attack or session expired.");
				setIsLoading(false);
				return;
			}

			try {
				console.log("Exchanging code for token...");
				const tokenData = await exchangeCodeForToken(code);

				if (!tokenData) {
					console.error("Token exchange returned null or undefined");
					throw new Error("Failed to exchange code for token");
				}

				console.log("Authentication successful, redirecting to playlists page...");
				// Keep showing skeletons during transition
				// Don't set isLoading to false as we want to keep showing the skeleton UI
				// Immediately redirect to playlists page - the skeleton UI there will show while data loads
				router.push("/playlists");
			} catch (err) {
				console.error("Error during token exchange:", err);
				setError("Failed to complete authentication. Please try again.");
				setIsLoading(false);
			}
		};

		handleCallback();
	}, [router, searchParams]);

	if (error) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center p-4">
				<div className="w-full max-w-md rounded-lg bg-destructive/10 p-6">
					<h1 className="mb-4 font-bold text-destructive text-xl">Authentication Error</h1>
					<p className="mb-6">{error}</p>
					<Button onClick={() => router.push("/")} variant="default" className="mr-2">
						Return Home
					</Button>
					<Button
						onClick={() => {
							// Clear any stored auth data and retry
							if (typeof window !== "undefined") {
								localStorage.removeItem("spotify_auth_state");
								localStorage.removeItem("spotify_code_verifier");
								localStorage.removeItem("spotify_token_data");
							}
							router.push("/");
						}}
						variant="outline"
					>
						Retry Login
					</Button>
				</div>
			</div>
		);
	}

	// We'll use the skeleton UI pattern for both states and auto-redirect instead of showing a success message
	// This creates a more consistent experience across the app
	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
					<div className="h-8 w-3/4 animate-pulse rounded-md bg-muted md:w-1/2" />
					<div className="h-4 w-full animate-pulse rounded-md bg-muted md:w-3/4" />
				</div>

				<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
					{/* Skeleton cards */}
					{Array.from({ length: 8 }).map((_, _index) => {
						const skeletonId = `skeleton-${Date.now()}-${Math.random().toString(36).slice(2)}`;
						return (
							<div key={skeletonId} className="flex flex-col rounded-lg border bg-card shadow-sm">
								<div className="p-4">
									<div className="mb-2 h-6 w-3/4 animate-pulse rounded-md bg-muted" />
								</div>
								<div className="px-4 py-2">
									<div className="relative mb-2 aspect-square w-full animate-pulse rounded-md bg-muted" />
									<div className="mb-2 h-4 w-20 animate-pulse rounded-md bg-muted" />
								</div>
								<div className="p-4 pt-0">
									<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default function Callback() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen flex-col items-center justify-center p-4">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
						<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
							<div className="h-8 w-3/4 animate-pulse rounded-md bg-muted md:w-1/2" />
							<div className="h-4 w-full animate-pulse rounded-md bg-muted md:w-3/4" />
						</div>

						{/* Just a few skeleton cards for the fallback */}
						<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
							{Array.from({ length: 4 }).map((_, _index) => {
								const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
								return (
									<div key={fallbackId} className="flex flex-col rounded-lg border bg-card shadow-sm">
										<div className="p-4">
											<div className="mb-2 h-6 w-3/4 animate-pulse rounded-md bg-muted" />
										</div>
										<div className="px-4 py-2">
											<div className="relative mb-2 aspect-square w-full animate-pulse rounded-md bg-muted" />
											<div className="mb-2 h-4 w-20 animate-pulse rounded-md bg-muted" />
										</div>
										<div className="p-4 pt-0">
											<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			}
		>
			<CallbackContent />
		</Suspense>
	);
}
