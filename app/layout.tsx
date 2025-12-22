import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'K-Rent Safety - 전월세 안전 검사',
  description: 'Check your jeonse deposit safety and wolse rent fairness with comprehensive property analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
