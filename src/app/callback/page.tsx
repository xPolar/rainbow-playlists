"use client";

import { Button } from "@/components/ui/button";
import { exchangeCodeForToken, getStoredState } from "@/lib/spotify";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Callback() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const handleCallback = async () => {
			console.log("Processing callback from Spotify...");

			const code = searchParams.get("code");
			const state = searchParams.get("state");
			const storedState = getStoredState();
			const hasError = searchParams.get("error");

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

				console.log("Authentication successful, redirecting to playlists");
				// Successfully authenticated, redirect to playlists page
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

	return (
		<div className="flex min-h-screen flex-col items-center justify-center p-4">
			<div className="text-center">
				{isLoading ? (
					<>
						<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-primary border-b-2" />
						<h2 className="mb-2 font-semibold text-xl">Completing Authentication</h2>
						<p className="text-muted-foreground">Please wait while we complete the authentication process...</p>
					</>
				) : (
					<>
						<h2 className="mb-4 font-semibold text-xl">Authentication Complete!</h2>
						<Button onClick={() => router.push("/playlists")} variant="default" className="mt-2">
							View Your Playlists
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
