import { Inter } from "next/font/google"
import "./globals.css"
import {Providers} from "../app/provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Smart Bulletin Board",
  description: "Layout of smart bulletin board",
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
      </body>
    </html>
  );
}
