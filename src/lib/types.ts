// Spotify API types

// Playlist folder structure interfaces
export interface SpotifyPlaylistItem {
	type: "playlist";
	id: string;
	name: string;
	spotifyPlaylist: SpotifyPlaylist;
}

export interface SpotifyFolder {
	id: string;
	name: string;
	type: "folder";
	children: (SpotifyPlaylistItem | SpotifyFolder)[];
}

export interface SpotifyPlaylistStructure {
	rootItems: (SpotifyPlaylistItem | SpotifyFolder)[];
	allPlaylists: SpotifyPlaylistItem[];
}

export interface SpotifyTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
	refresh_token: string;
}

export interface StoredTokenData extends SpotifyTokenResponse {
	expires_at: number;
}

export interface SpotifyUserProfile {
	id: string;
	display_name: string;
	email: string;
	images: { url: string }[];
	external_urls: { spotify: string };
	product: string;
}

export interface SpotifyPlaylist {
	id: string;
	name: string;
	description: string;
	images: { url: string; height: number | null; width: number | null }[];
	owner: { display_name: string; id: string };
	tracks: { total: number };
	external_urls: { spotify: string };
	public: boolean;
	collaborative: boolean;
	snapshot_id: string;
}

// Playlist with additional metadata about editability
export interface SpotifyPlaylistWithMeta extends SpotifyPlaylist {
	isEditable: boolean;
}

export interface SpotifyTrack {
	id: string;
	name: string;
	artists: { id: string; name: string }[];
	album: {
		id: string;
		name: string;
		images: { url: string; height: number; width: number }[];
	};
	uri: string;
	external_urls: { spotify: string };
	duration_ms: number;
}

export interface SpotifyPlaylistTrack {
	added_at: string;
	track: SpotifyTrack;
}

export interface SpotifyPaginatedResponse<T> {
	href: string;
	items: T[];
	limit: number;
	next: string | null;
	offset: number;
	previous: string | null;
	total: number;
}
