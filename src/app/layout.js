import { Inter } from "next/font/google"
import "./globals.css"
import {Providers} from "../app/provider"
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "CloudBoard",
  description: "Modern digital bulletin board system",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
              duration: 5000,
            },
          }}
        />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
