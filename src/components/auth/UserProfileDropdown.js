"use client"

import { useSession, signOut } from "next-auth/react"
import { Button, Avatar, Popover, PopoverTrigger, PopoverContent } from "@heroui/react"
import { User, LogOut, Settings } from "lucide-react"
import { useState } from "react"

export default function UserProfileDropdown() {
  const { data: session, status } = useSession()
  const [imageError, setImageError] = useState(false)

  if (status === "loading") {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  // Get user info with proper fallbacks
  const userImage = session.user?.image || session.user?.picture || ""
  const userName = session.user?.name || session.user?.email?.split('@')[0] || "User"
  const userEmail = session.user?.email || ""

  console.log('User session data:', { 
    image: userImage, 
    name: userName, 
    email: userEmail,
    fullSession: session.user 
  })

  // Create a fallback avatar component
  const FallbackAvatar = ({ size = "sm" }) => {
    const sizeClasses = size === "lg" ? "w-14 h-14 text-xl" : "w-10 h-10 text-sm"
    return (
      <div className={`${sizeClasses} bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center`}>
        <span className="text-white font-bold">
          {userName.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all duration-200 p-2 rounded-xl hover:bg-gray-50">
          {userImage && !imageError ? (
            <Avatar
              src={userImage}
              name={userName}
              size="sm"
              className="border-2 border-white shadow-lg ring-2 ring-blue-100 flex-shrink-0"
              onError={() => setImageError(true)}
            />
          ) : (
            <FallbackAvatar size="sm" />
          )}
          <div className="hidden md:flex md:flex-col md:items-start md:justify-center text-sm min-w-0">
            <p className="font-semibold text-gray-900 truncate leading-tight">{userName}</p>
            <p className="text-xs text-gray-500 leading-tight">Online</p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 border-0 shadow-xl rounded-2xl backdrop-blur-md bg-white/95">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            {userImage && !imageError ? (
              <Avatar
                src={userImage}
                name={userName}
                size="lg"
                className="ring-3 ring-blue-100 flex-shrink-0"
                onError={() => setImageError(true)}
              />
            ) : (
              <FallbackAvatar size="lg" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate leading-tight">{userName}</p>
              <p className="text-sm text-gray-500 truncate leading-tight">{userEmail}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="text-xs text-green-600 font-medium">Active</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              variant="light" 
              className="w-full justify-start hover:bg-gray-50 rounded-xl transition-all duration-200 h-12 flex items-center gap-3 px-3"
            >
              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-gray-700 flex-1 text-left">Profile</span>
            </Button>
            <Button
              variant="light" 
              className="w-full justify-start hover:bg-gray-50 rounded-xl transition-all duration-200 h-12 flex items-center gap-3 px-3"
            >
              <Settings className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="font-medium text-gray-700 flex-1 text-left">Settings</span>
            </Button>
            <Button
              variant="light" 
              className="w-full justify-start hover:bg-red-50 rounded-xl transition-all duration-200 text-red-600 h-12 flex items-center gap-3 px-3"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium flex-1 text-left">Sign Out</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
