"use client"

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Card, CardBody, Progress, Spinner } from "@heroui/react"
import { Upload, FileImage, Video, Trash2, Send, ArrowLeft, ExternalLink } from "lucide-react"
import { generateRoomId, supabase, BACKEND_URL } from '@/lib/supabase'
import Link from 'next/link'

function UploadContent() {
  const searchParams = useSearchParams()
  const [roomId, setRoomId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [manifest, setManifest] = useState(null)
  const [manifestVersion, setManifestVersion] = useState(1)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef(null)

  // Initialize room ID from URL parameter or generate new one
  useEffect(() => {
    const roomParam = searchParams.get('room')
    if (roomParam) {
      // Use room ID from URL (from dashboard)
      setRoomId(roomParam)
    } else if (!roomId) {
      // Generate new room ID if none provided (fallback if generateRoomId not available)
      const timestamp = Date.now().toString(36)
      const randomPart = Math.random().toString(36).substring(2, 15)
      const newRoomId = `${timestamp}-${randomPart}`
      setRoomId(newRoomId)
    }
  }, [searchParams])

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      return isImage || isVideo
    })

    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleFileInput = (e) => {
    const files = e.target.files
    if (files) {
      handleFileSelect(files)
    }
  }

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      setStatus('Please select files to upload')
      return
    }

    if (!roomId) {
      setStatus('Room ID is required')
      return
    }

    setUploading(true)
    setStatus('Uploading files...')
    setUploadProgress(0)

    try {
      // Prepare form data for backend
      const formData = new FormData()
      formData.append('room', roomId)
      
      selectedFiles.forEach(file => {
        formData.append('files', file)
      })

      // Upload files to backend
      const uploadResponse = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const uploadedItems = await uploadResponse.json()
      setUploadProgress(50)

      // Create manifest
      const newManifest = {
        version: manifestVersion,
        items: uploadedItems
      }

      setStatus('Broadcasting manifest...')

      // Broadcast manifest via Supabase Realtime
      if (supabase) {
        const channel = supabase.channel(`room-${roomId}`)
        await channel.subscribe()
        
        await channel.send({
          type: 'broadcast',
          event: 'playlist.replace',
          payload: newManifest
        })

        // Unsubscribe from channel
        await channel.unsubscribe()
      }

      setUploadProgress(75)

      setStatus('Saving manifest...')

      // Save manifest to storage via backend
      const manifestResponse = await fetch(`${BACKEND_URL}/save-manifest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomId,
          version: manifestVersion,
          items: uploadedItems
        }),
      })

      if (!manifestResponse.ok) {
        throw new Error(`Save manifest failed: ${manifestResponse.statusText}`)
      }

      const manifestResult = await manifestResponse.json()
      setUploadProgress(100)

      setStatus(`Successfully uploaded ${uploadedItems.length} files and updated playlist!`)
      setManifest(newManifest)
      setManifestVersion(prev => prev + 1)
      setSelectedFiles([])

    } catch (error) {
      console.error('Upload error:', error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setStatus('')
      }, 3000)
    }
  }



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="bordered" startContent={<ArrowLeft className="w-4 h-4" />}>
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">TV Display Upload Control</h1>
              <p className="text-gray-600">Upload images and videos to control remote displays</p>
              {roomId && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                    Room: {roomId.substring(0, 20)}...
                  </span>
                  <Link href={`/display?room=${roomId}`} target="_blank">
                    <Button size="sm" variant="bordered" startContent={<ExternalLink className="w-3 h-3" />}>
                      View Display
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* File Upload Area */}
        <Card className="mb-6">
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Media Files</h2>
            
            {/* Drop Zone */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer mb-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
              <p className="text-gray-500">Supports images (JPG, PNG, GIF) and videos (MP4, MOV, AVI)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileInput}
            />

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {file.type.startsWith('video/') ? (
                          <Video className="w-5 h-5 text-blue-500" />
                        ) : (
                          <FileImage className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        onPress={() => removeFile(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Controls */}
            <div className="flex gap-4 items-center">
              <Button
                color="primary"
                size="lg"
                onPress={uploadFiles}
                isDisabled={selectedFiles.length === 0 || uploading || !roomId}
                startContent={uploading ? <Spinner size="sm" /> : <Send className="w-5 h-5" />}
              >
                {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
              </Button>
              
              {uploading && (
                <div className="flex-1">
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
            </div>

            {/* Status */}
            {status && (
              <div className={`mt-4 p-3 rounded-lg ${
                status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                {status}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Current Manifest */}
        {manifest && (
          <Card>
            <CardBody className="p-6">
              <h2 className="text-xl font-semibold mb-4">Current Playlist</h2>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Version: {manifest.version}</p>
                <p className="text-sm text-gray-600">Items: {manifest.items.length}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {manifest.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-2">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={`Item ${index + 1}`} className="w-full h-20 object-cover rounded mb-2" />
                      ) : (
                        <div className="w-full h-20 bg-gray-800 rounded mb-2 flex items-center justify-center">
                          <Video className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <p className="text-xs text-center capitalize">{item.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Loading upload page...</p>
        </div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  )
}
