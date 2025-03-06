import type { SpotifyTokenResponse, StoredTokenData } from "./types";

// Spotify API constants
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

// Redirect URI (needs to be added to your Spotify Developer Dashboard)
const REDIRECT_URI = "http://localhost:3000/callback";

// Scopes needed for our application
const SCOPE = [
	"user-read-private",
	"user-read-email",
	"playlist-read-private",
	"playlist-read-collaborative",
	"playlist-modify-public",
	"playlist-modify-private",
].join(" ");

// You'll need to add your Spotify Client ID to your .env.local file
const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;

// Generate a random string for the state parameter and code verifier
export const generateRandomString = (length: number): string => {
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let text = "";
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
};

// Save state to localStorage to prevent CSRF attacks
export const storeState = (state: string): void => {
	if (typeof window !== "undefined") {
		localStorage.setItem("spotify_auth_state", state);
	}
};

// Store the code verifier for PKCE flow
export const storeCodeVerifier = (codeVerifier: string): void => {
	if (typeof window !== "undefined") {
		localStorage.setItem("spotify_code_verifier", codeVerifier);
	}
};

// Get stored code verifier
export const getStoredCodeVerifier = (): string | null => {
	if (typeof window !== "undefined") {
		return localStorage.getItem("spotify_code_verifier");
	}
	return null;
};

// Generate a code challenge from the code verifier (for PKCE flow)
export const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
	// Hash the code verifier using SHA-256
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);

	try {
		// Use the Web Crypto API to hash the code verifier
		const digest = await window.crypto.subtle.digest("SHA-256", data);

		// Convert the hash to a base64url encoded string
		// This creates a URL-safe base64 string (base64url encoding)
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, "-") // Replace + with -
			.replace(/\//g, "_") // Replace / with _
			.replace(/=+$/, ""); // Remove trailing =
	} catch (error) {
		console.error("Error generating code challenge:", error);
		throw new Error("Failed to generate code challenge for PKCE flow");
	}
};

// Get stored state from localStorage
export const getStoredState = (): string | null => {
	if (typeof window !== "undefined") {
		return localStorage.getItem("spotify_auth_state");
	}
	return null;
};

// Save auth data to localStorage
export const storeTokenData = (data: SpotifyTokenResponse): void => {
	if (typeof window !== "undefined") {
		const expiresAt = Date.now() + data.expires_in * 1000;
		const tokenData: StoredTokenData = {
			...data,
			expires_at: expiresAt,
		};
		localStorage.setItem("spotify_token_data", JSON.stringify(tokenData));
	}
};

// Get stored token data from localStorage
export const getStoredTokenData = (): StoredTokenData | null => {
	if (typeof window !== "undefined") {
		const data = localStorage.getItem("spotify_token_data");
		if (data) {
			return JSON.parse(data) as StoredTokenData;
		}
	}
	return null;
};

// Clear stored token data
export const clearStoredTokenData = (): void => {
	if (typeof window !== "undefined") {
		localStorage.removeItem("spotify_token_data");
		localStorage.removeItem("spotify_auth_state");
	}
};

// Check if the user is logged in and the token is valid
export const isLoggedIn = (): boolean => {
	const tokenData = getStoredTokenData();
	if (!tokenData) return false;
	return Date.now() < tokenData.expires_at;
};

// Refresh the access token using the refresh token
export const refreshAccessToken = async (): Promise<StoredTokenData | null> => {
	console.log("Refreshing access token...");
	const tokenData = getStoredTokenData();

	if (!tokenData || !tokenData.refresh_token) {
		console.error("No refresh token available");
		return null;
	}

	const payload = new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: tokenData.refresh_token,
		client_id: CLIENT_ID || "",
	});

	try {
		const response = await fetch(TOKEN_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: payload.toString(),
		});

		if (!response.ok) {
			// Get the error details from the response body
			const errorData = await response.text();
			console.error("Spotify API error while refreshing token:", {
				status: response.status,
				statusText: response.statusText,
				body: errorData,
			});
			throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		console.log("Successfully refreshed token");

		const newTokenData: StoredTokenData = {
			...tokenData,
			access_token: data.access_token,
			expires_in: data.expires_in,
			expires_at: Date.now() + data.expires_in * 1000,
		};

		storeTokenData(newTokenData);
		return newTokenData;
	} catch (error) {
		console.error("Error refreshing token:", error);
		console.log("Clearing stored token data due to refresh failure");
		clearStoredTokenData();
		return null;
	}
};

// Get a valid access token (refresh if needed)
export const getAccessToken = async (): Promise<string | null> => {
	if (!isLoggedIn()) {
		const refreshed = await refreshAccessToken();
		if (!refreshed) return null;
		return refreshed.access_token;
	}

	const tokenData = getStoredTokenData();
	return tokenData?.access_token || null;
};

// Generate the Spotify authorization URL (with PKCE)
export const getAuthUrl = async (): Promise<string> => {
	// Generate state and code verifier
	const state = generateRandomString(16);
	const codeVerifier = generateRandomString(64);

	// Store state and code verifier
	storeState(state);
	storeCodeVerifier(codeVerifier);

	// Generate code challenge from code verifier
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	const params = new URLSearchParams({
		client_id: CLIENT_ID || "",
		response_type: "code",
		redirect_uri: REDIRECT_URI,
		state,
		scope: SCOPE,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
	});

	return `${AUTH_ENDPOINT}?${params.toString()}`;
};

// Exchange the authorization code for an access token (with PKCE)
export const exchangeCodeForToken = async (code: string): Promise<SpotifyTokenResponse | null> => {
	// Get stored code verifier
	const codeVerifier = getStoredCodeVerifier();
	if (!codeVerifier) {
		console.error("No code verifier found");
		return null;
	}

	// Build the token request payload
	const payload = new URLSearchParams({
		client_id: CLIENT_ID || "",
		grant_type: "authorization_code",
		code,
		redirect_uri: REDIRECT_URI,
		code_verifier: codeVerifier,
	});

	try {
		// Post to the token endpoint to exchange the code for tokens
		const response = await fetch(TOKEN_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: payload.toString(),
		});

		if (!response.ok) {
			// Extract error information from the response
			const errorText = await response.text();
			console.error("Token exchange error:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});
			throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
		}

		// Parse and store the token response
		const data = await response.json();
		storeTokenData(data);
		return data;
	} catch (error) {
		console.error("Error exchanging code for token:", error);
		return null;
	}
};
