// Color-related utilities for album art and sorting
import type { SpotifyPlaylistTrack } from "./types";

// Cache for storing previously calculated colors to improve performance
const colorCache: Record<string, { h: number; s: number; l: number }> = {};

// Convert RGB to HSL (Hue, Saturation, Lightness)
export const rgbToHsl = ({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } => {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h;
	let s;
	const l = (max + min) / 2;

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
			default:
				h = 0;
		}

		h /= 6;
	}

	return { h, s, l };
};

// Get average color from an image
export const getAverageColor = async (imageUrl: string): Promise<{ r: number; g: number; b: number }> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			canvas.width = img.width;
			canvas.height = img.height;
			context.drawImage(img, 0, 0);

			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			let r = 0;
			let g = 0;
			let b = 0;
			const pixelCount = data.length / 4;

			for (let i = 0; i < data.length; i += 4) {
				r += data[i];
				g += data[i + 1];
				b += data[i + 2];
			}

			r = Math.floor(r / pixelCount);
			g = Math.floor(g / pixelCount);
			b = Math.floor(b / pixelCount);

			resolve({ r, g, b });
		};

		img.onerror = () => {
			reject(new Error("Failed to load image"));
		};

		img.src = imageUrl;
	});
};

// Extract dominant color from album art
export const getDominantColor = async (imageUrl: string): Promise<{ r: number; g: number; b: number }> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			// Resize for performance while maintaining aspect ratio
			const maxDimension = 100; // Small enough for performance, large enough for accuracy
			const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
			canvas.width = Math.floor(img.width * scale);
			canvas.height = Math.floor(img.height * scale);

			context.drawImage(img, 0, 0, canvas.width, canvas.height);
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			const data = imageData.data;

			// Color counting with bucketing to find dominant colors
			const colorMap: Record<string, { count: number; r: number; g: number; b: number }> = {};

			// Filter out borders by focusing on central region (25% margin)
			const marginX = Math.floor(canvas.width * 0.25);
			const marginY = Math.floor(canvas.height * 0.25);

			// Process each pixel in the central region
			for (let y = marginY; y < canvas.height - marginY; y++) {
				for (let x = marginX; x < canvas.width - marginX; x++) {
					const i = (y * canvas.width + x) * 4;

					// Skip transparent pixels
					if (data[i + 3] < 200) continue;

					// Color quantization - reduce precision to group similar colors
					// Lower numbers = more precision, higher = more grouping
					const bucketSize = 16;
					const r = Math.floor(data[i] / bucketSize) * bucketSize;
					const g = Math.floor(data[i + 1] / bucketSize) * bucketSize;
					const b = Math.floor(data[i + 2] / bucketSize) * bucketSize;

					// Skip near-black and near-white colors (often borders/text/backgrounds)
					const isNearBlack = r < 30 && g < 30 && b < 30;
					const isNearWhite = r > 220 && g > 220 && b > 220;
					const isGray = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;

					// Skip black, white, and gray colors unless they're the only colors
					if (isNearBlack || isNearWhite || isGray) continue;

					const key = `${r}:${g}:${b}`;
					if (colorMap[key]) {
						colorMap[key].count++;
					} else {
						colorMap[key] = { count: 1, r, g, b };
					}
				}
			}

			// Find dominant color
			let dominantColor = { r: 0, g: 0, b: 0 };
			let maxCount = 0;

			// Weighted score favoring bright, saturated colors
			for (const color of Object.values(colorMap)) {
				const { r, g, b, count } = color;

				// Convert to HSL to assess color quality
				const { s, l } = rgbToHsl({ r, g, b });

				// Weight the count by saturation and brightness to prefer vibrant colors
				// Colors with saturation < 0.2 are essentially grayscale, so they get penalized
				// Colors too dark (l < 0.1) or too light (l > 0.9) are also less interesting
				const saturationWeight = s < 0.2 ? 0.2 : s;
				const brightnessWeight = l < 0.1 || l > 0.9 ? 0.5 : 1;
				const weightedCount = count * saturationWeight * brightnessWeight;

				if (weightedCount > maxCount) {
					maxCount = weightedCount;
					dominantColor = { r, g, b };
				}
			}

			// If no dominant color found (all were filtered), use average color as fallback
			if (maxCount === 0) {
				let r = 0;
				let g = 0;
				let b = 0;
				const pixelCount = data.length / 4;
				for (let i = 0; i < data.length; i += 4) {
					r += data[i];
					g += data[i + 1];
					b += data[i + 2];
				}
				dominantColor = {
					r: Math.floor(r / pixelCount),
					g: Math.floor(g / pixelCount),
					b: Math.floor(b / pixelCount),
				};
			}

			resolve(dominantColor);
		};

		img.onerror = () => {
			reject(new Error("Failed to load image"));
		};

		img.src = imageUrl;
	});
};

// Calculate color properties for a track
export const getTrackColorProperties = async (track: SpotifyPlaylistTrack) => {
	try {
		const imageUrl = track.track.album.images[0]?.url;
		if (!imageUrl) {
			return {
				...track,
				hue: -1,
				saturation: 0,
				lightness: 0,
				colorCategory: -1,
				isGrayscale: true,
				isWhite: false,
			};
		}

		// Use cached color if available
		let hsl;
		if (colorCache[imageUrl]) {
			hsl = colorCache[imageUrl];
		} else {
			// Get dominant color
			const rgb = await getDominantColor(imageUrl);
			hsl = rgbToHsl(rgb);
			colorCache[imageUrl] = hsl; // Cache the result
		}

		const { h, s, l } = hsl;

		// Map hue to basic color categories for rainbow grouping
		let colorCategory;
		if (h < 0.025 || h >= 0.975)
			colorCategory = 0; // Red (0-9 degrees or 351-360)
		else if (h < 0.075)
			colorCategory = 1; // Red-Orange (9-27 degrees)
		else if (h < 0.125)
			colorCategory = 2; // Orange (27-45 degrees)
		else if (h < 0.175)
			colorCategory = 3; // Orange-Yellow (45-63 degrees)
		else if (h < 0.225)
			colorCategory = 4; // Yellow (63-81 degrees)
		else if (h < 0.375)
			colorCategory = 5; // Green (81-135 degrees)
		else if (h < 0.5)
			colorCategory = 6; // Turquoise (135-180 degrees)
		else if (h < 0.575)
			colorCategory = 7; // Light Blue (180-207 degrees)
		else if (h < 0.675)
			colorCategory = 8; // Blue (207-243 degrees)
		else if (h < 0.775)
			colorCategory = 9; // Purple (243-279 degrees)
		else if (h < 0.875)
			colorCategory = 10; // Pink (279-315 degrees)
		else colorCategory = 11; // Magenta/Pink-Red (315-351 degrees)

		// Classify white and grayscale colors
		const isWhite = l > 0.9 && s < 0.15;
		const isGrayscale = s < 0.2 && !isWhite;

		return {
			...track,
			hue: h,
			saturation: s,
			lightness: l,
			colorCategory,
			isGrayscale,
			isWhite,
		};
	} catch (error) {
		console.error("Error analyzing color:", error);
		return {
			...track,
			hue: -1,
			saturation: 0,
			lightness: 0,
			colorCategory: -1,
			isGrayscale: true,
			isWhite: false,
		};
	}
};

// Sort tracks by the dominant color of their album art
export const sortTracksByHue = async (tracks: SpotifyPlaylistTrack[]): Promise<SpotifyPlaylistTrack[]> => {
	// Process tracks in batches to prevent rate limiting and improve performance
	const batchSize = 8;
	const tracksWithColor = [];

	for (let i = 0; i < tracks.length; i += batchSize) {
		const batch = tracks.slice(i, i + batchSize);
		const processedBatch = await Promise.all(batch.map((track) => getTrackColorProperties(track)));
		tracksWithColor.push(...processedBatch);

		// Small delay to prevent potential rate limiting
		if (i + batchSize < tracks.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	// Group tracks by color category with separate groups for white and grayscale
	const colorGroups: Record<number, (typeof tracksWithColor)[0][]> = {};
	const whiteTracks: (typeof tracksWithColor)[0][] = [];
	const grayscaleTracks: (typeof tracksWithColor)[0][] = [];

	for (const track of tracksWithColor) {
		if (track.isWhite) {
			whiteTracks.push(track);
		} else if (track.isGrayscale || track.colorCategory === -1) {
			grayscaleTracks.push(track);
		} else {
			if (!colorGroups[track.colorCategory]) {
				colorGroups[track.colorCategory] = [];
			}
			colorGroups[track.colorCategory].push(track);
		}
	}

	// Sort tracks within each color group for smoother transitions
	for (const key of Object.keys(colorGroups)) {
		const category = Number(key);
		colorGroups[category].sort((a, b) => {
			// Within each color category, first sort by exact hue for smooth transitions
			if (Math.abs(a.hue - b.hue) > 0.01) {
				return a.hue - b.hue;
			}
			// Then by saturation (more saturated first)
			if (Math.abs(a.saturation - b.saturation) > 0.1) {
				return b.saturation - a.saturation;
			}
			// Finally by lightness (from dark to light)
			return a.lightness - b.lightness;
		});
	}

	// Sort white tracks by exact lightness for smooth transitions
	whiteTracks.sort((a, b) => b.lightness - a.lightness);

	// Sort grayscale tracks by lightness (from dark to light)
	grayscaleTracks.sort((a, b) => a.lightness - b.lightness);

	// Create the final rainbow order
	const sortedTracks = [];

	// Add colors in rainbow order (ROY G BIV)
	// We use 0-11 as our color categories, representing the color wheel
	for (let i = 0; i < 12; i++) {
		if (colorGroups[i] && colorGroups[i].length > 0) {
			sortedTracks.push(...colorGroups[i]);
		}
	}

	// Add white tracks as a distinct group (after colors, before dark grays)
	sortedTracks.push(...whiteTracks);

	// Add grayscale tracks at the end
	sortedTracks.push(...grayscaleTracks);

	// Return the final sorted tracks without the extra properties we added
	return sortedTracks.map(
		({ hue, saturation, lightness, colorCategory, isGrayscale, isWhite, ...track }) => track as SpotifyPlaylistTrack
	);
};
