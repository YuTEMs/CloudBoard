"use client"

import { Button, Card, CardBody, Input } from "@heroui/react"
import { Search, Plus, Copy, Upload, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
// Import is safe now - no immediate error throwing
import { AppHeader } from "../../components/layout/app-hearder"

const mockDisplays = [
  { 
    id: "DISP001", 
    location: "Main Lobby",
    roomId: "1736740254okg-f47ac10b58cc4372a5670e02b2c3d479dc6d"
  },
  { 
    id: "DISP002", 
    location: "Conference Room A",
    roomId: "1736740285abc-9e2b3d8c5f1a4b7e6d9c8e3f2a5b8c1d4e7f"
  },
  { 
    id: "DISP003", 
    location: "Cafeteria",
    roomId: "1736740316def-b8e7c4a1f6d3e9b2c5a8d1e4f7a3b6c9e2d5"
  },
]

export default function DashboardPage() {
  const [copiedItem, setCopiedItem] = useState(null)
  const [displayUrls, setDisplayUrls] = useState({})

  // Set display URLs after component mounts to avoid hydration mismatch
  useEffect(() => {
    const urls = {}
    mockDisplays.forEach(display => {
      urls[display.id] = `${window.location.origin}/display?room=${display.roomId}`
    })
    setDisplayUrls(urls)
  }, [])

  const copyToClipboard = async (text, itemId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      setTimeout(() => setCopiedItem(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Display ID:</span>
                        <p className="font-medium">{display.id}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Location:</span>
                        <p className="font-medium">{display.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="bordered"
                      startContent={<Copy className="w-4 h-4" />}
                      onPress={() => copyToClipboard(
                        displayUrls[display.id] || `/display?room=${display.roomId}`,
                        `display-${display.id}`
                      )}
                      color={copiedItem === `display-${display.id}` ? "success" : "default"}
                    >
                      {copiedItem === `display-${display.id}` ? "Copied!" : "Copy Link"}
                    </Button>
                    <Link href={`/upload?room=${display.roomId}`}>
                      <Button 
                        color="primary" 
                        size="sm"
                        startContent={<Upload className="w-4 h-4" />}
                        className="w-full"
                      >
                        Upload Content
                      </Button>
                    </Link>
                    <Link href={`/display?room=${display.roomId}`} target="_blank">
                      <Button 
                        color="secondary" 
                        variant="bordered"
                        size="sm"
                        startContent={<ExternalLink className="w-4 h-4" />}
                        className="w-full"
                      >
                        Open Display
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
