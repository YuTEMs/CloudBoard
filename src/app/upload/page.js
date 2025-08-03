"use client"

import { Button, Card, CardBody } from "@heroui/react"
import { ImageIcon, Video } from "lucide-react"
import Link from "next/link"
import { AppHeader } from "../../components/layout/app-hearder"
import { useState, useRef } from "react"

export default function UploadPage() {
    const [uploadedFiles, setUploadedFiles] = useState([])
    const imageInputRef = useRef(null)
    const videoInputRef = useRef(null)

    const handleFileUpload = (files, type) => {
        const newFiles = Array.from(files).map((file) => ({
            id: `${type}_${Date.now()}_${Math.random()}`,
            name: file.name,
            type: type,
            file: file,
            url: URL.createObjectURL(file),
            size: file.size,
        }))

        setUploadedFiles((prev) => [...prev, ...newFiles])
    }
    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleDrop = (e, type) => {
        e.preventDefault()
        const files = e.dataTransfer.files
        handleFileUpload(files, type)
    }

    const removeFile = (fileId) => {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
    }
    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader title="Upload Page" showBack backHref="/dashboard" />

            <div className="p-4">
                <div className="space-y-6">
                    {/* Images Upload Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Images:</h3>
                        <Card>
                            <CardBody className="p-8">
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, "image")}
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-gray-600 mb-2">Drag & Drop Images</p>
                                    <p className="text-sm text-gray-500">or click to browse</p>
                                    <p className="text-xs text-gray-400 mt-2">Supports: JPG, PNG, GIF, WebP</p>
                                </div>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e.target.files, "image")}
                                />
                            </CardBody>
                        </Card>
                        {/* Display uploaded images */}
                        {uploadedFiles.filter((f) => f.type === "image").length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Uploaded Images:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {uploadedFiles
                                        .filter((f) => f.type === "image")
                                        .map((file) => (
                                            <div key={file.id} className="relative group">
                                                <img
                                                    src={file.url || "/placeholder.svg"}
                                                    alt={file.name}
                                                    className="w-full h-24 object-cover rounded border"
                                                />
                                                <button
                                                    onClick={() => removeFile(file.id)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Videos Upload Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Videos:</h3>
                        <Card>
                            <CardBody className="p-8">
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, "video")}
                                    onClick={() => videoInputRef.current?.click()}
                                >
                                    <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                    <p className="text-gray-600 mb-2">Drag & Drop Videos</p>
                                    <p className="text-sm text-gray-500">or click to browse</p>
                                    <p className="text-xs text-gray-400 mt-2">Supports: MP4, WebM, MOV</p>
                                </div>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    multiple
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e.target.files, "video")}
                                />
                            </CardBody>
                        </Card>
                        {/* Display uploaded videos */}
                        {uploadedFiles.filter((f) => f.type === "video").length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Uploaded Videos:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {uploadedFiles
                                        .filter((f) => f.type === "video")
                                        .map((file) => (
                                            <div key={file.id} className="relative group">
                                                <div className="w-full h-24 bg-gray-200 rounded border flex items-center justify-center relative">
                                                    <Video className="w-8 h-8 text-gray-500" />
                                                    <button
                                                        onClick={() => removeFile(file.id)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Link href="/organize" className="flex-1">
                            <Button variant="bordered" className="w-full">
                                Skip
                            </Button>
                        </Link>
                        <Link
                            href={{
                                pathname: "/organize",
                                query: { uploadedFiles: JSON.stringify(uploadedFiles) },
                            }}
                            className="flex-1"
                        >
                            <Button color="primary" className="w-full">
                                Continue to Organize ({uploadedFiles.length} files)
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
