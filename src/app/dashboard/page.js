"use client"

import { Button, Card, CardBody, Input } from "@heroui/react"
import { Search, Plus } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "../../components/layout/app-hearder"

const mockDisplays = [
  { id: "DISP001", location: "Main Lobby" },
  { id: "DISP002", location: "Conference Room A" },
  { id: "DISP003", location: "Cafeteria" },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Dashboard Page" />

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">List of displays</h2>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Select all"
              variant="bordered"
              startContent={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Button isIconOnly variant="bordered">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {mockDisplays.map((display) => (
            <Card key={display.id}>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Board ID:</span>
                        <p className="font-medium">{display.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Board Location:</span>
                        <p className="font-medium">{display.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/preview">
                      <Button variant="bordered" size="sm">
                        Preview
                      </Button>
                    </Link>
                    <Link href="/upload">
                      <Button color="primary" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
