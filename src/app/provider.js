"use client"

import { HeroUIProvider } from "@heroui/react"
import { SessionProvider } from "next-auth/react"
import { useEffect, useState } from "react"

export function Providers({ children }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <SessionProvider>
        <HeroUIProvider>
          {children}
        </HeroUIProvider>
      </SessionProvider>
    )
  }

  return (
    <SessionProvider>
      <HeroUIProvider>{children}</HeroUIProvider>
    </SessionProvider>
  )
}
