"use client"

import { useSession, signOut } from "next-auth/react"
import { Button, Avatar, Popover, PopoverTrigger, PopoverContent } from "@heroui/react"
import { User, LogOut, Settings } from "lucide-react"

export default function UserProfileDropdown() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <Avatar
            src={session.user?.image || ""}
            name={session.user?.name || session.user?.email || "User"}
            size="sm"
            className="border-2 border-white shadow-sm"
          />
          <div className="hidden md:block text-sm">
            <p className="font-medium text-gray-900">{session.user?.name}</p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b">
            <Avatar
              src={session.user?.image || ""}
              name={session.user?.name || session.user?.email || "User"}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{session.user?.name}</p>
              <p className="text-sm text-gray-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="light" 
              className="w-full justify-start gap-2"
              startContent={<User className="w-4 h-4" />}
            >
              Profile
            </Button>
            <Button
              variant="light" 
              className="w-full justify-start gap-2"
              startContent={<Settings className="w-4 h-4" />}
            >
              Settings
            </Button>
            <Button
              variant="light" 
              className="w-full justify-start gap-2 text-danger"
              startContent={<LogOut className="w-4 h-4" />}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
