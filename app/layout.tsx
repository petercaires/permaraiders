import type React from "react"
import type { Metadata } from "next"
import { RotateCw } from "lucide-react"
import "./globals.css"

const title = "Permaraiders: PFP Collection Demo"
const description = "A collection of 165 raiders, made for the @permaraidz Telegram community drop."
const shareImage = { url: "/og.png", width: 1200, height: 630, alt: "Perma Raiders wordmark above a green raider's head" }

export const metadata: Metadata = {
  metadataBase: new URL("https://www.permaraiders.xyz"),
  title,
  description,
  // What link previews show (X, Telegram, Discord, iMessage…)
  openGraph: { title, description, url: "/", siteName: "Permaraiders", type: "website", images: [shareImage] },
  authors: [{ name: "@peterlikesthis", url: "https://www.twitter.com/peterlikesthis" }],
  creator: "@peterlikesthis",
  twitter: { card: "summary_large_image", title, description, creator: "@peterlikesthis", images: [shareImage] },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* Phones held sideways: covers the whole page (hero, grid, loader) until it's turned back upright */}
        <div className="rotate-notice fixed inset-0 z-[2000] flex-col items-center justify-center gap-4 bg-background text-center select-none">
          <img src="/header.png" alt="Perma Raiders" className="h-14 w-auto object-contain" />
          <RotateCw aria-hidden className="w-6 h-6 text-white" />
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-white">Rotate your phone</p>
            <p className="text-xs text-white/70">Permaraiders works best upright.</p>
          </div>
        </div>
      </body>
    </html>
  )
}
