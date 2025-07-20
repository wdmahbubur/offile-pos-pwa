import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Offline POS System',
  description: 'A simple offline-capable POS system',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
