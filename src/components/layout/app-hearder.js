import { Button } from "@heroui/react"
import { ArrowLeft, Menu, User } from "lucide-react"
import Link from "next/link"

export function AppHeader({ title, showBack = false, backHref = "/" }) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-4">
        {showBack ? (
          <Link href={backHref}>
            <Button isIconOnly variant="light">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        ) : (
          <Button isIconOnly variant="light">
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <Button isIconOnly variant="light">
        <User className="w-5 h-5" />
      </Button>
    </header>
  )
}
