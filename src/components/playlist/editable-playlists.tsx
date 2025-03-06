"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type SpotifyPlaylistWithMeta, categorizeEditablePlaylists } from "@/lib/spotify";
import { cn } from "@/lib/utils";
import { Music, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface EditablePlaylistsProps {
	onPlaylistSelect: (playlistId: string) => void;
	currentPlaylistId: string | null;
	isSelectable?: boolean;
}

export function EditablePlaylists({
	onPlaylistSelect,
	currentPlaylistId,
	isSelectable = true,
}: EditablePlaylistsProps) {
	const [ownedPlaylists, setOwnedPlaylists] = useState<SpotifyPlaylistWithMeta[]>([]);
	const [collaborativePlaylists, setCollaborativePlaylists] = useState<SpotifyPlaylistWithMeta[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [expandedCategories, setExpandedCategories] = useState<string[]>(["owned", "collaborative"]);

	useEffect(() => {
		loadPlaylists();
	}, []);

	const loadPlaylists = async () => {
		try {
			setIsLoading(true);
			const categorized = await categorizeEditablePlaylists();
			setOwnedPlaylists(categorized.ownedPlaylists);
			setCollaborativePlaylists(categorized.collaborativePlaylists);
		} catch (error) {
			console.error("Error loading playlists:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const _toggleCategory = (category: string) => {
		setExpandedCategories((prev) =>
			prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
		);
	};

	const renderPlaylist = (playlist: SpotifyPlaylistWithMeta) => {
		const isSelected = currentPlaylistId === playlist.id;
		const hasImages = playlist.images && playlist.images.length > 0;
		const thumbnailUrl = hasImages ? playlist.images[0].url : null;

		return (
			<button
				key={playlist.id}
				className={cn(
					"flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
					isSelectable && "cursor-pointer hover:bg-accent",
					isSelected && "bg-accent"
				)}
				onClick={() => isSelectable && onPlaylistSelect(playlist.id)}
				disabled={!isSelectable}
				aria-selected={isSelected}
				type="button"
			>
				{thumbnailUrl ? (
					<div className="relative h-9 w-9 overflow-hidden rounded">
						<img src={thumbnailUrl} alt={playlist.name} className="h-full w-full object-cover" />
					</div>
				) : (
					<div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
						<Music className="h-4 w-4 text-muted-foreground" />
					</div>
				)}
				<div className="flex-1 truncate">
					<p className={cn("truncate text-sm", isSelected && "font-medium")}>{playlist.name}</p>
					<p className="truncate text-muted-foreground text-xs">{playlist.tracks.total} tracks</p>
				</div>
				{playlist.collaborative && (
					<Badge variant="outline" className="ml-auto text-xs">
						Collaborative
					</Badge>
				)}
			</button>
		);
	};

	if (isLoading) {
		return (
			<div className="flex min-h-32 items-center justify-center">
				<div className="flex items-center gap-2">
					<RefreshCw className="h-4 w-4 animate-spin" />
					<span>Loading playlists...</span>
				</div>
			</div>
		);
	}

	const hasPlaylists = ownedPlaylists.length > 0 || collaborativePlaylists.length > 0;

	if (!hasPlaylists) {
		return (
			<div className="flex min-h-32 flex-col items-center justify-center gap-4 text-center">
				<p className="text-muted-foreground">No editable playlists found</p>
				<Button size="sm" variant="outline" onClick={loadPlaylists}>
					Refresh
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="mb-4 flex items-center justify-between gap-2">
				<div>
					<h3 className="font-medium">Editable Playlists</h3>
					<p className="text-muted-foreground text-xs">Only showing playlists you can edit</p>
				</div>
				<Button size="sm" variant="outline" onClick={loadPlaylists}>
					<RefreshCw className="mr-2 h-3 w-3" />
					Refresh
				</Button>
			</div>

			<div className="max-h-[600px] overflow-auto pr-2">
				<Accordion type="multiple" value={expandedCategories} className="space-y-2">
					{ownedPlaylists.length > 0 && (
						<AccordionItem value="owned" className="rounded-md border px-1">
							<AccordionTrigger className="px-1 py-2 hover:no-underline">
								<div className="flex items-center">
									Your Playlists
									<Badge variant="secondary" className="ml-2">
										{ownedPlaylists.length}
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="pt-1 pb-2">
								<div className="space-y-1">{ownedPlaylists.map((playlist) => renderPlaylist(playlist))}</div>
							</AccordionContent>
						</AccordionItem>
					)}

					{collaborativePlaylists.length > 0 && (
						<AccordionItem value="collaborative" className="rounded-md border px-1">
							<AccordionTrigger className="px-1 py-2 hover:no-underline">
								<div className="flex items-center">
									Collaborative Playlists
									<Badge variant="secondary" className="ml-2">
										{collaborativePlaylists.length}
									</Badge>
								</div>
							</AccordionTrigger>
							<AccordionContent className="pt-1 pb-2">
								<div className="space-y-1">{collaborativePlaylists.map((playlist) => renderPlaylist(playlist))}</div>
							</AccordionContent>
						</AccordionItem>
					)}
				</Accordion>
			</div>
		</div>
	);
}
