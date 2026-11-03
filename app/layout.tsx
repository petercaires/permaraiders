import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
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
        <Analytics />
      </body>
    </html>
  )
}
