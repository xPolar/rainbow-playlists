import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "rainbow playlists",
	description: "make rainbow playlists",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
					<div className="flex min-h-screen flex-col justify-between">
						<Header />
						<main className="flex-1">{children}</main>
						{/* <footer className="mt-auto border-t py-6 text-center text-muted-foreground text-sm">
							<p>
								made with ❤️ by{" "}
								<a
									className="underline hover:no-underline"
									href="https://x.com/xPolarrr"
									rel="noopener noreferrer"
									target="_blank"
								>
									haris
								</a>{" "}
								(
								<a
									className="underline hover:no-underline"
									href="https://github.com/xPolar/rainbow-playlists"
									rel="noopener noreferrer"
									target="_blank"
								>
									source
								</a>
								)
							</p>
						</footer> */}
					</div>
					<Toaster />
					<SpeedInsights />
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
