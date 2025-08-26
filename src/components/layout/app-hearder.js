import { Button } from "@heroui/react"
import { ArrowLeft, Menu } from "lucide-react"
import Link from "next/link"
import UserProfileDropdown from "../auth/UserProfileDropdown"

export function AppHeader({ title, showBack = false, backHref = "/" }) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-black bg-white">
      <div className="flex items-center gap-4">
        {showBack ? (
          <Link href={backHref}>
            <Button isIconOnly variant="light" className="hover:bg-black hover:text-white">
              <ArrowLeft className="w-5 h-5 text-black" />
            </Button>
          </Link>
        ) : (
          <Button isIconOnly variant="light" className="hover:bg-black hover:text-white">
            <Menu className="w-5 h-5 text-black" />
          </Button>
        )}
        <h1 className="text-xl font-semibold text-black">{title}</h1>
      </div>
      <UserProfileDropdown />
    </header>
  )
}
