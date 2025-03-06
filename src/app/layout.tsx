import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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
	title: "Rainbow Playlists",
	description: "Create beautiful playlists with Rainbow",
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
					<div className="flex min-h-screen flex-col">
						<Header />
						<main className="flex-1">{children}</main>
						<footer className="border-t py-6 text-center text-muted-foreground text-sm">
							<p>
								made with ❤️ by{" "}
								<a className="hover:underline" href="https://x.com/xPolarrr" rel="noopener noreferrer" target="_blank">
									haris
								</a>{" "}
								(
								<a
									className="hover:underline"
									href="https://github.com/xPolar/rainbow-playlists"
									rel="noopener noreferrer"
									target="_blank"
								>
									source
								</a>
								)
							</p>
						</footer>
					</div>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
