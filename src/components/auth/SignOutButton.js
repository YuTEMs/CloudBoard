"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@heroui/react"

export default function SignOutButton({ className = "" }) {
  const { data: session } = useSession()

  if (!session) return null

  return (
    <Button
      onClick={() => signOut({ callbackUrl: '/login' })}
      variant="bordered"
      className={`border-black text-black hover:bg-black hover:text-white ${className}`}
    >
      Sign Out
    </Button>
  )
}
