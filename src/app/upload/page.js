"use client"

import { Button, Card, CardBody } from "@heroui/react"
import { ImageIcon, Video } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "../../components/layout/app-hearder"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Upload Page" showBack backHref="/dashboard" />

      <div className="p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Images:</h3>
            <Card>
              <CardBody className="p-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-2">Drag & Drop</p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Videos:</h3>
            <Card>
              <CardBody className="p-8">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-2">Drag & Drop</p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="flex gap-4 pt-4">
            <Link href="/dashboard" className="flex-1">
              <Button variant="bordered" className="w-full">
                Skip
              </Button>
            </Link>
            <Link href="/organize" className="flex-1">
              <Button color="primary" className="w-full">
                Confirm
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
