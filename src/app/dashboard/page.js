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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <AppHeader title="Dashboard" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="spinner mx-auto mb-6"></div>
            <p className="text-gray-600 font-medium">Loading your boards...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <AppHeader title="Dashboard" />
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">!</span>
              </div>
            </div>
            <p className="text-red-600 font-medium mb-4">Error loading boards: {error}</p>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:shadow-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <AppHeader title="Dashboard" />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex-1">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">My Boards</h2>
              <p className="text-gray-600 text-lg">Manage and organize your bulletin boards</p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-3 rounded-2xl border border-blue-200/50 shadow-sm">
              <span className="text-blue-800 font-bold text-lg">{boards.length} {boards.length === 1 ? 'Board' : 'Boards'}</span>
            </div>
          </div>
          
          <div className="flex gap-6 mb-8">
            <div className="flex-1 relative">
              <Input
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="bordered"
                startContent={<Search className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                size="lg"
                classNames={{
                  input: "text-gray-900 font-medium pl-3",
                  inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/90 backdrop-blur-sm transition-all duration-300 rounded-2xl shadow-sm group-data-[focus=true]:shadow-lg group-data-[focus=true]:border-blue-500 h-14 flex items-center",
                  innerWrapper: "flex items-center gap-3"
                }}
              />
            </div>
            <Button
              onPress={onOpen}
              size="lg"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl flex items-center justify-center gap-3 h-14"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Create Board</span>
            </Button>
          </div>
        </div>

        {filteredBoards.length === 0 && !searchQuery && (
          <div className="text-center py-20">
            <div className="relative">
              <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center">
                  <Plus className="w-12 h-12 text-gray-700" />
                </div>
              </div>
              <div className="absolute top-4 right-1/2 translate-x-12 w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="absolute top-8 left-1/2 -translate-x-16 w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Create Your First Board</h3>
            <p className="text-gray-600 mb-10 max-w-lg mx-auto text-lg leading-relaxed">Get started by creating your first bulletin board. Add widgets, announcements, and customize it to perfectly fit your needs.</p>
            <Button 
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-10 py-4 rounded-2xl flex items-center justify-center gap-3 h-14" 
              onPress={onOpen}
              size="lg"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              <span>Create Your First Board</span>
            </Button>
          </div>
        )}

        {filteredBoards.length === 0 && searchQuery && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No boards found</h3>
            <p className="text-gray-600 text-lg mb-2">No boards match "{searchQuery}"</p>
            <p className="text-gray-500 text-sm">Try adjusting your search terms or create a new board</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBoards.map((board, index) => (
            <div
              key={board.id}
              className="fade-in group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Status indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm animate-pulse"></div>
                  <span className="text-xs font-medium text-green-700 bg-green-100/80 px-2 py-1 rounded-full">Active</span>
                </div>

                <div className="relative z-10 p-8">
                  {/* Header section */}
                  <div className="mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-200 line-clamp-1">
                          {board.name}
                        </h3>
                        <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full group-hover:w-16 transition-all duration-300"></div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed min-h-[2.5rem] line-clamp-2">
                      {board.description || "No description provided"}
                    </p>
                  </div>

                  {/* Metadata section */}
                  <div className="mb-8 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Created</span>
                        <span className="bg-white/80 px-2 py-1 rounded-lg">{new Date(board.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Updated</span>
                        <span className="bg-white/80 px-2 py-1 rounded-lg">{new Date(board.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-3">
                    <Button
                      size="md"
                      variant="flat"
                      onPress={() => copyBoardUrl(board)}
                      className={`w-full font-medium rounded-xl transition-all duration-300 flex items-center justify-center gap-2 h-12 ${
                        copiedItem === board.id 
                          ? "bg-green-500/10 text-green-700 border-green-200 shadow-sm" 
                          : "bg-gray-100/80 text-gray-700 hover:bg-green-100 hover:text-green-700 hover:shadow-md hover:scale-[1.02]"
                      }`}
                    >
                      <Copy className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-center">{copiedItem === board.id ? "✓ Copied!" : "Copy Display URL"}</span>
                    </Button>

                    <div className="flex gap-3">
                      <Link href={`/organize?board=${board.id}`} className="flex-1">
                        <Button
                          size="md"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-medium rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 h-12"
                        >
                          <Edit className="w-4 h-4 flex-shrink-0" />
                          <span>Edit</span>
                        </Button>
                      </Link>
                      <Link href={`/display?board=${board.id}`} target="_blank" className="flex-1">
                        <Button
                          variant="bordered"
                          size="md"
                          className="w-full border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 font-medium rounded-xl transition-all duration-300 hover:shadow-md hover:scale-[1.02] flex items-center justify-center gap-2 h-12"
                        >
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                          <span>Preview</span>
                        </Button>
                      </Link>
                    </div>

                    <Button
                      size="sm"
                      variant="light"
                      onClick={() => handleDeleteBoard(board.id)}
                      className="w-full text-red-600 hover:bg-red-50/80 font-medium rounded-xl transition-all duration-300 hover:shadow-sm flex items-center justify-center gap-2 h-10"
                    >
                      <Trash2 className="w-4 h-4 flex-shrink-0" />
                      <span>Delete Board</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Board Modal */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange} 
        placement="top-center"
        classNames={{
          base: "bg-white/95 backdrop-blur-md rounded-3xl border-0",
          backdrop: "bg-black/30 backdrop-blur-sm"
        }}
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              scale: 1,
              transition: {
                duration: 0.3,
                ease: "easeOut",
              },
            },
            exit: {
              y: -20,
              opacity: 0,
              scale: 0.95,
              transition: {
                duration: 0.2,
                ease: "easeIn",
              },
            },
          }
        }}
      >
        <ModalContent className="border-0 shadow-2xl rounded-3xl overflow-hidden">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-gray-900 p-8 pb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create New Board</h3>
                </div>
                <p className="text-sm text-gray-600 font-normal ml-11">Design your perfect bulletin board layout</p>
              </ModalHeader>
              <ModalBody className="p-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Board Name</label>
                    <Input
                      autoFocus
                      placeholder="Enter a catchy board name..."
                      variant="bordered"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      classNames={{
                        input: "text-gray-900 font-medium",
                        inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-300 rounded-xl group-data-[focus=true]:border-blue-500 group-data-[focus=true]:shadow-lg"
                      }}
                      style={{ outline: 'none', boxShadow: 'none' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 block">Description (Optional)</label>
                    <Textarea
                      placeholder="Describe what this board will be used for..."
                      variant="bordered"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      classNames={{
                        input: "text-gray-900",
                        inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-300 rounded-xl group-data-[focus=true]:border-blue-500 group-data-[focus=true]:shadow-lg !h-auto !min-h-fit"
                      }}
                      style={{ outline: 'none', boxShadow: 'none' }}
                      minRows={3}
                      maxRows={5}
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="p-8 pt-6 bg-gray-50/30 border-t border-gray-100/50">
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="bordered" 
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all duration-300 rounded-xl hover:shadow-md flex items-center justify-center h-12" 
                    onPress={onClose}
                  >
                    <span>Cancel</span>
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 hover:shadow-lg hover:scale-[1.02] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12"
                    onPress={createNewBoard}
                    isDisabled={!newBoardName.trim()}
                  >
                    <span>Create Board</span>
                  </Button>
                </div>
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
