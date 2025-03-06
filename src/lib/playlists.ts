// Playlist-related functionality for Spotify
import { getAccessToken } from "./auth";
import { sortTracksByHue } from "./colors";
import type {
	SpotifyFolder,
	SpotifyPaginatedResponse,
	SpotifyPlaylist,
	SpotifyPlaylistItem,
	SpotifyPlaylistStructure,
	SpotifyPlaylistTrack,
	SpotifyPlaylistWithMeta,
	SpotifyUserProfile,
} from "./types";

// Spotify API base URL
const API_BASE = "https://api.spotify.com/v1";

// API call to get the current user's profile
export const getUserProfile = async (): Promise<SpotifyUserProfile | null> => {
	const accessToken = await getAccessToken();
	if (!accessToken) return null;

	try {
		const response = await fetch(`${API_BASE}/me`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error getting user profile:", error);
		return null;
	}
};

// API call to get the user's playlists with pagination support
export const getUserPlaylists = async (
	options: { includeAllPages?: boolean } = {}
): Promise<SpotifyPaginatedResponse<SpotifyPlaylist> | null> => {
	const accessToken = await getAccessToken();
	if (!accessToken) return null;

	try {
		// First page - get up to 50 playlists
		let response = await fetch(`${API_BASE}/me/playlists?limit=50`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get playlists: ${response.status} ${response.statusText}`);
		}

		const playlistData: SpotifyPaginatedResponse<SpotifyPlaylist> = await response.json();

		// If we need all pages and there are more playlists to fetch
		if (options.includeAllPages && playlistData.next) {
			const allItems = [...playlistData.items];
			let nextUrl = playlistData.next;

			// Keep fetching until there are no more pages
			while (nextUrl) {
				console.log(`Fetching next page of playlists: ${nextUrl}`);
				response = await fetch(nextUrl, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to get playlist page: ${response.status} ${response.statusText}`);
				}

				const nextPageData: SpotifyPaginatedResponse<SpotifyPlaylist> = await response.json();
				allItems.push(...nextPageData.items);
				nextUrl = nextPageData.next!;
			}

			// Update the response with all items
			playlistData.items = allItems;
			playlistData.next = null;
		}

		return playlistData;
	} catch (error) {
		console.error("Error getting playlists:", error);
		return null;
	}
};

// Get all playlists and mark which ones are editable by the user
export const getPlaylistsWithEditInfo = async (): Promise<SpotifyPlaylistWithMeta[]> => {
	try {
		// Get all user playlists
		const playlistsResponse = await getUserPlaylists({ includeAllPages: true });
		if (!playlistsResponse) return [];

		// Get user profile to check ownership
		const userProfile = await getUserProfile();
		if (!userProfile) return [];

		// Mark playlists as editable if they're owned by the user or collaborative
		return playlistsResponse.items.map((playlist) => {
			const isOwned = playlist.owner.id === userProfile.id;
			const isEditable = isOwned || playlist.collaborative;

			return {
				...playlist,
				isEditable,
			};
		});
	} catch (error) {
		console.error("Error getting playlists with edit info:", error);
		return [];
	}
};

// Filter playlists to only those that the user has edit permissions for
export const getEditablePlaylists = async (): Promise<SpotifyPlaylistWithMeta[]> => {
	const playlists = await getPlaylistsWithEditInfo();
	return playlists.filter((playlist) => playlist.isEditable);
};

// Get a sorted list of editable playlists
export const getSortedEditablePlaylists = async (): Promise<SpotifyPlaylistWithMeta[]> => {
	const playlists = await getEditablePlaylists();

	// Sort by name
	return playlists.sort((a, b) => {
		return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
	});
};

// Categorize playlists by type for better organization
export const categorizeEditablePlaylists = async (): Promise<{
	ownedPlaylists: SpotifyPlaylistWithMeta[];
	collaborativePlaylists: SpotifyPlaylistWithMeta[];
}> => {
	const playlists = await getEditablePlaylists();

	// Get user profile to check ownership
	const userProfile = await getUserProfile();
	if (!userProfile) {
		return { ownedPlaylists: [], collaborativePlaylists: [] };
	}

	// Separate owned playlists from collaborative playlists
	const ownedPlaylists: SpotifyPlaylistWithMeta[] = [];
	const collaborativePlaylists: SpotifyPlaylistWithMeta[] = [];

	for (const playlist of playlists) {
		if (playlist.owner.id === userProfile.id) {
			ownedPlaylists.push(playlist);
		} else if (playlist.collaborative) {
			collaborativePlaylists.push(playlist);
		}
	}

	// Sort each category by name
	ownedPlaylists.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
	collaborativePlaylists.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

	return { ownedPlaylists, collaborativePlaylists };
};

// Try to determine folder structure from Spotify playlists
// Note: Spotify Web API doesn't directly expose folder structure,
// so we'll try to infer it from playlist names and organization patterns
export const getPlaylistFolderStructure = async (): Promise<SpotifyPlaylistStructure | null> => {
	try {
		// Get all playlists including those that aren't editable
		const playlistsResponse = await getUserPlaylists({ includeAllPages: true });
		if (!playlistsResponse) return null;

		// Start with all playlists as root items
		const allPlaylists: SpotifyPlaylistItem[] = playlistsResponse.items.map((playlist) => ({
			type: "playlist",
			id: playlist.id,
			name: playlist.name,
			spotifyPlaylist: playlist,
		}));

		// Try to identify folders from playlist names
		// Common patterns: "Folder/Playlist" or "Folder: Playlist" or "Folder | Playlist"
		const folderMap: Record<string, SpotifyFolder> = {};
		const rootItems: (SpotifyPlaylistItem | SpotifyFolder)[] = [];

		// First pass: identify potential folders and create the structure
		for (const playlist of allPlaylists) {
			// Match common folder separator patterns
			const folderMatch = playlist.name.match(/^(.+?)[\/:|\-]\s*(.+)$/);

			if (folderMatch) {
				const folderName = folderMatch[1].trim();
				const playlistName = folderMatch[2].trim();

				// Update the playlist name to not include the folder
				playlist.name = playlistName;

				// Create or use existing folder
				if (!folderMap[folderName]) {
					folderMap[folderName] = {
						id: `folder-${folderName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
						name: folderName,
						type: "folder",
						children: [],
					};
					rootItems.push(folderMap[folderName]);
				}

				// Add playlist to folder
				folderMap[folderName].children.push(playlist);
			} else {
				// No folder pattern found, add to root
				rootItems.push(playlist);
			}
		}

		// Now sort everything
		// Sort playlists within folders
		for (const folder of Object.values(folderMap)) {
			folder.children.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
		}

		// Sort root items (folders first, then playlists)
		rootItems.sort((a, b) => {
			// Folders come before playlists
			if (a.type !== b.type) {
				return a.type === "folder" ? -1 : 1;
			}
			// Otherwise sort alphabetically
			return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
		});

		return {
			rootItems,
			allPlaylists,
		};
	} catch (error) {
		console.error("Error creating playlist folder structure:", error);
		return null;
	}
};

// API call to get a playlist's tracks with full pagination support
export const getPlaylistTracks = async (
	playlistId: string,
	options: { includeAllPages?: boolean } = { includeAllPages: true }
): Promise<SpotifyPaginatedResponse<SpotifyPlaylistTrack> | null> => {
	const accessToken = await getAccessToken();
	if (!accessToken) return null;

	try {
		// First page
		let response = await fetch(`${API_BASE}/playlists/${playlistId}/tracks?limit=100`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to get playlist tracks: ${response.status} ${response.statusText}`);
		}

		const tracksData: SpotifyPaginatedResponse<SpotifyPlaylistTrack> = await response.json();

		// If we need all pages and there are more tracks to fetch
		if (options.includeAllPages && tracksData.next) {
			const allItems = [...tracksData.items];
			let nextUrl = tracksData.next;

			// Keep fetching until there are no more pages
			while (nextUrl) {
				console.log(`Fetching next page of tracks: ${nextUrl}`);
				response = await fetch(nextUrl, {
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				});

				if (!response.ok) {
					throw new Error(`Failed to get tracks page: ${response.status} ${response.statusText}`);
				}

				const nextPageData: SpotifyPaginatedResponse<SpotifyPlaylistTrack> = await response.json();
				allItems.push(...nextPageData.items);
				nextUrl = nextPageData.next!;
			}

			// Update the response with all items
			tracksData.items = allItems;
			tracksData.next = null;
		}

		return tracksData;
	} catch (error) {
		console.error("Error getting playlist tracks:", error);
		return null;
	}
};

// API call to reorder tracks in a playlist
export const reorderPlaylistTracks = async (
	playlistId: string,
	uris: string[],
	snapshotId?: string
): Promise<{ snapshot_id: string } | null> => {
	const accessToken = await getAccessToken();
	if (!accessToken) return null;

	try {
		const response = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				uris,
				snapshot_id: snapshotId,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Failed to reorder playlist tracks:", {
				status: response.status,
				statusText: response.statusText,
				body: errorText,
			});
			throw new Error(`Failed to reorder playlist tracks: ${response.status} ${response.statusText}`);
		}

		return await response.json();
	} catch (error) {
		console.error("Error reordering playlist tracks:", error);
		return null;
	}
};
