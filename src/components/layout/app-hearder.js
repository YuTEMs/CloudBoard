import { Button } from "@heroui/react"
import { ArrowLeft, Menu, ClipboardList } from "lucide-react"
import Link from "next/link"
import UserProfileDropdown from "../auth/UserProfileDropdown"

export function AppHeader({ title, showBack = false, backHref = "/" }) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4">
        {showBack ? (
          <Link href={backHref}>
            <Button 
              isIconOnly 
              variant="light" 
              className="hover:bg-gray-100 transition-all duration-200 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Button>
          </Link>
        ) : (
          <Button 
            isIconOnly 
            variant="light" 
            className="hover:bg-gray-100 transition-all duration-200 rounded-xl"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </Button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
      </div>
      <UserProfileDropdown />
    </header>
  )
}
