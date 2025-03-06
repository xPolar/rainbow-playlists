"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
	type SpotifyPlaylist,
	type SpotifyPlaylistTrack,
	type SpotifyPlaylistWithMeta,
	type SpotifyUserProfile,
	getEditablePlaylists,
	getPlaylistTracks,
	getUserProfile,
	isLoggedIn,
	reorderPlaylistTracks,
	sortTracksByHue,
} from "@/lib/spotify";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Music, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Sortable track item component for drag and drop interface
function SortableTrackItem({
	track,
	id,
}: {
	track: SpotifyPlaylistTrack;
	id: string;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : 1,
		opacity: isDragging ? 0.8 : 1,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="mb-2 flex items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
		>
			<div {...attributes} {...listeners} className="cursor-grab text-muted-foreground active:cursor-grabbing">
				<GripVertical size={18} />
			</div>
			<div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-sm">
				{track.track.album.images?.[0]?.url ? (
					<img
						src={track.track.album.images[0].url}
						alt={track.track.album.name}
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-muted">
						<Music className="h-5 w-5 text-muted-foreground" />
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{track.track.name}</p>
				<p className="truncate text-muted-foreground text-xs">{track.track.artists.map((a) => a.name).join(", ")}</p>
			</div>
		</div>
	);
}

export default function PlaylistsPage() {
	const router = useRouter();
	const [playlists, setPlaylists] = useState<SpotifyPlaylistWithMeta[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);

	// Preview modal state
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [previewPlaylist, setPreviewPlaylist] = useState<SpotifyPlaylist | null>(null);
	const [originalTracks, setOriginalTracks] = useState<SpotifyPlaylistTrack[]>([]);
	const [sortedTracks, setSortedTracks] = useState<SpotifyPlaylistTrack[]>([]);
	const [isApplyingChanges, setIsApplyingChanges] = useState(false);
	const [hasDuplicates, setHasDuplicates] = useState(false);
	// Track if shift key is being held
	const [isShiftKeyDown, setIsShiftKeyDown] = useState(false);

	// Set up DnD sensors
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Handle keyboard events for shift key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Shift") {
				setIsShiftKeyDown(true);
			}
		};

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") {
				setIsShiftKeyDown(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	useEffect(() => {
		// Check if user is logged in
		if (!isLoggedIn()) {
			// Use replace instead of push for a more immediate redirect
			router.replace("/");
			return;
		}

		// Load user profile and playlists
		const loadData = async () => {
			try {
				setIsLoading(true);
				// Verify user is authenticated (will throw error if not authorized)
				// User profile is now managed globally by the header component
				await getUserProfile();

				// Get only playlists the user can edit
				const editablePlaylists = await getEditablePlaylists();
				setPlaylists(editablePlaylists);
			} catch (error) {
				console.error("Error loading data:", error);
				toast.error("i couldn't load your playlists :(");
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [router]);

	const createRainbowPlaylist = async (playlist: SpotifyPlaylist) => {
		try {
			setIsProcessing(true);
			setCurrentPlaylistId(playlist.id);
			setPreviewPlaylist(playlist);

			// 1. Get all tracks from the playlist
			const tracksData = await getPlaylistTracks(playlist.id);
			if (!tracksData?.items || tracksData.items.length === 0) {
				toast.error("i couldn't find any songs in this playlist :(");
				return;
			}

			toast.info(`processing ${tracksData.items.length} tracks from "${playlist.name}"...`);

			// Save original tracks for reference
			setOriginalTracks(tracksData.items);

			// 2. Sort tracks by the hue of their album art (rainbow order)
			const rainbowSortedTracks = await sortTracksByHue(tracksData.items);
			setSortedTracks(rainbowSortedTracks);

			// Check if there are duplicate tracks
			const trackIds = rainbowSortedTracks.map((track) => track.track.id);
			const uniqueTrackIds = new Set(trackIds);
			setHasDuplicates(trackIds.length > uniqueTrackIds.size);

			// 3. Open the preview modal instead of applying changes immediately
			setIsPreviewOpen(true);

			// Reset the processing state once the preview is ready
			setIsProcessing(false);
			setCurrentPlaylistId(null);
		} catch (error) {
			console.error("Error creating rainbow playlist preview:", error);
			toast.error("error creating rainbow playlist preview :(");
			setIsProcessing(false);
			setCurrentPlaylistId(null);
		}
	};

	// Handle track reordering in the preview
	const handleDragEnd = (event: any) => {
		const { active, over } = event;

		if (active.id !== over.id) {
			setSortedTracks((tracks) => {
				// Extract the index from our composite IDs (format: track-{id}-{index})
				const oldIndexStr = active.id.split("-").pop();
				const newIndexStr = over.id.split("-").pop();

				// Convert to numbers for array manipulation
				const oldIndex = Number.parseInt(oldIndexStr, 10);
				const newIndex = Number.parseInt(newIndexStr, 10);

				// Verify we have valid indices
				if (
					!Number.isNaN(oldIndex) &&
					!Number.isNaN(newIndex) &&
					oldIndex >= 0 &&
					oldIndex < tracks.length &&
					newIndex >= 0 &&
					newIndex < tracks.length
				) {
					return arrayMove(tracks, oldIndex, newIndex);
				}
				return tracks; // Return unchanged if indices are invalid
			});
		}
	};

	// Remove duplicate tracks while preserving order
	const purgeDuplicates = () => {
		const uniqueTracks: SpotifyPlaylistTrack[] = [];
		const seenIds = new Set<string>();

		// Filter out duplicates while maintaining order
		for (const track of sortedTracks) {
			if (!seenIds.has(track.track.id)) {
				seenIds.add(track.track.id);
				uniqueTracks.push(track);
			}
		}

		// Update state with unique tracks
		setSortedTracks(uniqueTracks);
		setHasDuplicates(false);
		toast.success(
			`removed ${sortedTracks.length - uniqueTracks.length} duplicate track${
				sortedTracks.length - uniqueTracks.length === 1 ? "" : "s"
			}`
		);
	};

	// Apply changes to the actual playlist
	const applyRainbowOrder = async () => {
		if (!previewPlaylist || sortedTracks.length === 0) return;

		try {
			setIsApplyingChanges(true);

			// Get the track URIs in the new order
			const trackUris = sortedTracks.map((item) => item.track.uri);

			// Reorder the playlist with the new track order
			const result = await reorderPlaylistTracks(previewPlaylist.id, trackUris, previewPlaylist.snapshot_id);

			if (result) {
				toast.success(`"${previewPlaylist.name}" tasted the rainbow`);
				// Close the preview modal
				setIsPreviewOpen(false);
			} else {
				toast.error("i couldn't apply the rainbow order :(");
			}
		} catch (error) {
			console.error("Error applying rainbow order:", error);
			toast.error("error applying rainbow order :(");
		} finally {
			setIsApplyingChanges(false);
			setCurrentPlaylistId(null);
		}
	};

	// State to track if we're in client-side rendering
	const [isClient, setIsClient] = useState(false);

	// State to track if playlists are loading
	const [isLoading, setIsLoading] = useState(true);

	// Set isClient to true once component mounts (client-side only)
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Handle auth check - this will only run client-side now
	useEffect(() => {
		if (isClient && !isLoggedIn()) {
			router.replace("/");
		}
	}, [isClient, router]);

	// Prepare a skeleton UI for initial server render that won't cause hydration mismatches
	if (!isClient) {
		return (
			<div className="w-full px-6 py-8 md:px-8 md:py-10">
				<div className="mx-auto flex w-full flex-col gap-8">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
						<h2 className="text-center font-bold text-3xl tracking-tight md:text-left">your playlists</h2>
						<p className="text-center text-muted-foreground md:text-left">
							these are only playlists you can edit. choose one.
						</p>
					</div>
					<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
						{/* Just a few skeleton cards for server-side rendering */}
						{Array.from({ length: 4 }).map((_, _index) => {
							const skeletonId = `ssr-skeleton-${Date.now()}-${Math.random().toString(36).slice(2)}`;
							return (
								<div key={skeletonId} className="flex flex-col rounded-lg border bg-card shadow-sm">
									<div className="p-4">
										<div className="mb-2 h-6 w-3/4 rounded-md bg-muted" />
									</div>
									<div className="px-4 py-2">
										<div className="relative mb-2 aspect-square w-full rounded-md bg-muted" />
										<div className="mb-2 h-4 w-20 rounded-md bg-muted" />
									</div>
									<div className="p-4 pt-0">
										<div className="h-10 w-full rounded-md bg-muted" />
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		);
	}

	// Ensure a stable DOM structure that's identical on both server and client
	return (
		<div className="w-full px-6 py-8 md:px-8 md:py-10">
			<div className="mx-auto flex w-full flex-col gap-8">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
					<h2 className="text-center font-bold text-3xl tracking-tight md:text-left">your playlists</h2>
					<p className="text-center text-muted-foreground md:text-left">
						these are only playlists you can edit. choose one.
					</p>
				</div>

				{/* Only show dynamic content after client-side hydration */}
				{!isClient || isLoading ? (
					<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{/* Skeleton cards to show while loading */}
						{Array.from({ length: 10 }).map((_, _index) => {
							const skeletonId = `skeleton-${Date.now()}-${Math.random().toString(36).slice(2)}`;
							return (
								<Card key={skeletonId} className="flex flex-col">
									<CardHeader className="pt-4 pb-2">
										<div className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
									</CardHeader>
									<CardContent className="pt-0 pb-2">
										<div className="relative mb-2 aspect-square w-full animate-pulse overflow-hidden rounded-md bg-muted" />
										<div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
									</CardContent>
									<CardFooter className="pt-0">
										<div className="h-10 w-full animate-pulse rounded-md bg-muted" />
									</CardFooter>
								</Card>
							);
						})}
					</div>
				) : playlists.length === 0 ? (
					<div className="py-12 text-center">
						<p className="mb-4 text-lg">make some playlists.</p>
					</div>
				) : (
					<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{playlists.map((playlist) => (
							<Card key={playlist.id} className="flex flex-col">
								<CardHeader className="pt-4 pb-2">
									<CardTitle className="line-clamp-1">{playlist.name}</CardTitle>
								</CardHeader>
								<CardContent className="pt-0 pb-2">
									<div className="relative mb-2 aspect-square w-full overflow-hidden rounded-md">
										{playlist.images?.[0]?.url ? (
											<img src={playlist.images[0].url} alt={playlist.name} className="h-full w-full object-cover" />
										) : (
											<div className="flex h-full w-full items-center justify-center bg-muted">
												<Music className="h-12 w-12 text-muted-foreground" />
											</div>
										)}
									</div>
									<p className="text-muted-foreground text-sm">{playlist.tracks.total} songs</p>
								</CardContent>
								<CardFooter className="pt-0">
									<Button
										onClick={() => createRainbowPlaylist(playlist)}
										disabled={isProcessing}
										className="w-full"
										variant={currentPlaylistId === playlist.id ? "secondary" : "default"}
									>
										{currentPlaylistId === playlist.id ? (
											<>
												<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
												processing...
											</>
										) : (
											"taste the rainbow"
										)}
									</Button>
								</CardFooter>
							</Card>
						))}
					</div>
				)}
			</div>

			{/* Preview modal for rainbow playlist */}
			<Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3">
							<div className="relative h-10 w-10 overflow-hidden rounded-md">
								{previewPlaylist?.images?.[0]?.url ? (
									<img
										src={previewPlaylist.images[0].url}
										alt={previewPlaylist.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-muted">
										<Music className="h-5 w-5 text-muted-foreground" />
									</div>
								)}
							</div>
							preview: {previewPlaylist?.name}
						</DialogTitle>
						<DialogDescription>tracks are arranged based on album cover. drag and drop to re-order.</DialogDescription>
					</DialogHeader>

					<div className="max-h-[500px] overflow-y-auto pr-1">
						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
							<SortableContext
								items={sortedTracks.map((track, index) => `track-${track.track.id}-${index}`)}
								strategy={verticalListSortingStrategy}
							>
								{sortedTracks.map((track, index) => (
									<SortableTrackItem
										key={`track-${track.track.id}-${index}`}
										id={`track-${track.track.id}-${index}`}
										track={track}
									/>
								))}
							</SortableContext>
						</DndContext>
					</div>

					<DialogFooter className="flex justify-between sm:justify-between">
						<Button
							variant="outline"
							onClick={() => {
								setIsPreviewOpen(false);
								setIsProcessing(false);
								setCurrentPlaylistId(null);
							}}
							disabled={isApplyingChanges}
						>
							nevermind
						</Button>
						<div className="flex gap-2">
							<Button
								variant="secondary"
								onClick={() => {
									if (isShiftKeyDown) {
										// Randomize tracks when shift is held
										const shuffled = [...sortedTracks].sort(() => Math.random() - 0.5);
										setSortedTracks(shuffled);
										toast.success("tracks randomized successfully");
									} else {
										// Reset to original when shift is not held
										setSortedTracks([...originalTracks]);
									}
								}}
								disabled={isApplyingChanges}
							>
								{isShiftKeyDown ? "mix it up" : "reset"}
							</Button>
							{hasDuplicates && (
								<Button variant="outline" onClick={purgeDuplicates} disabled={isApplyingChanges}>
									purge duplicates
								</Button>
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="default" onClick={applyRainbowOrder} disabled={isApplyingChanges}>
										{isApplyingChanges ? (
											<>
												<RefreshCw className="h-4 w-4 animate-spin" />
												applying...
											</>
										) : (
											<>
												<Save className="h-4 w-4" />
												save
											</>
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>warning: this will reset the "data added" field for all songs.</p>
								</TooltipContent>
							</Tooltip>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
