"use client"

import { Button, Card, CardBody, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Textarea } from "@heroui/react"
import { Search, Plus, Copy, Edit, ExternalLink, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { AppHeader } from "../../components/layout/app-hearder"
import { generateRoomId } from "../../lib/utils"
import ProtectedRoute from "../../components/auth/ProtectedRoute"
import { useRealtimeBoards } from "../../hooks/useRealtimeBoards"

function DashboardContent() {
  const [copiedItem, setCopiedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const { isOpen, onOpen, onOpenChange } = useDisclosure()

  // Use real-time boards hook
  const { boards, loading, error, createBoard, deleteBoard: deleteBoardFromDb } = useRealtimeBoards()

  const createNewBoard = async () => {
    if (!newBoardName.trim()) return

    try {
      const newBoard = {
        id: generateRoomId() || `board_${Date.now()}`,
        name: newBoardName.trim(),
        description: newBoardDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        configuration: {
          items: [],
          widgets: [],
          canvasSize: { width: 1920, height: 1080 },
          backgroundImage: null,
          backgroundColor: "#ffffff"
        }
      }

      await createBoard(newBoard)
      setNewBoardName("")
      setNewBoardDescription("")
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating board:', err)
      // You could add a toast notification here
    }
  }

  const handleDeleteBoard = async (boardId) => {
    try {
      await deleteBoardFromDb(boardId)
    } catch (err) {
      console.error('Error deleting board:', err)
      // You could add a toast notification here
    }
  }

  const copyBoardUrl = async (board) => {
    const boardUrl = `${window.location.origin}/display?board=${board.id}`
    try {
      await navigator.clipboard.writeText(boardUrl)
      setCopiedItem(board.id)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (board.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Dashboard" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p>Loading your boards...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="Dashboard" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center text-red-600">
            <p>Error loading boards: {error}</p>
            <Button 
              className="mt-4 bg-black text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title="Dashboard" />

      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-black">My Boards ({boards.length})</h2>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="bordered"
              startContent={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Button
              startContent={<Plus className="w-4 h-4" />}
              onPress={onOpen}
              className="bg-black text-white hover:bg-gray-800"
            >
              Create Board
            </Button>
          </div>
        </div>

        {filteredBoards.length === 0 && !searchQuery && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-black rounded-full flex items-center justify-center">
              <Plus className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-black mb-2">No boards yet</h3>
            <p className="text-black mb-4">Create your first board to get started</p>
            <Button className="bg-black text-white hover:bg-gray-800" startContent={<Plus className="w-4 h-4" />} onPress={onOpen}>
              Create Your First Board
            </Button>
          </div>
        )}

        {filteredBoards.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-black">No boards found matching "{searchQuery}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoards.map((board) => (
            <Card key={board.id} className="hover:shadow-lg transition-shadow border-2 border-black">
              <CardBody className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 truncate text-black">{board.name}</h3>
                  <p className="text-sm text-black line-clamp-2 h-10">
                    {board.description || "No description"}
                  </p>
                </div>

                <div className="text-xs text-black mb-4">
                  <p>Created: {new Date(board.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(board.updatedAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    startContent={<Copy className="w-4 h-4" />}
                    onPress={() => copyBoardUrl(board)}
                    className={`w-full border-black ${
                      copiedItem === board.id 
                        ? "bg-green-500 text-white border-green-500" 
                        : "text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {copiedItem === board.id ? "Copied!" : "Copy URL"}
                  </Button>

                  <div className="flex gap-2">
                    <Link href={`/organize?board=${board.id}`} className="flex-1">
                      <Button
                        size="sm"
                        startContent={<Edit className="w-4 h-4" />}
                        className="w-full bg-black text-white hover:bg-gray-800"
                      >
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/display?board=${board.id}`} target="_blank" className="flex-1">
                      <Button
                        variant="bordered"
                        size="sm"
                        startContent={<ExternalLink className="w-4 h-4" />}
                        className="w-full border-black text-black hover:bg-black hover:text-white"
                      >
                        View
                      </Button>
                    </Link>
                  </div>

                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    startContent={<Trash2 className="w-4 h-4" />}
                                              onClick={() => handleDeleteBoard(board.id)}
                    className="w-full"
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Board Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-black">Create New Board</ModalHeader>
              <ModalBody>
                <Input
                  autoFocus
                  label="Board Name"
                  placeholder="Enter board name"
                  variant="bordered"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  classNames={{
                    input: "text-black",
                    label: "text-black"
                  }}
                />
                <Textarea
                  label="Description"
                  placeholder="Enter board description (optional)"
                  variant="bordered"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  classNames={{
                    input: "text-black",
                    label: "text-black"
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="bordered" className="border-black text-black hover:bg-black hover:text-white" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  className="bg-black text-white hover:bg-gray-800"
                  onPress={createNewBoard}
                  isDisabled={!newBoardName.trim()}
                >
                  Create Board
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
