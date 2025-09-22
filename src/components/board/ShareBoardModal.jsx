"use client"

import { useState, useEffect } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Chip,
  Card,
  CardBody,
  Divider,
  Code,
  Tooltip
} from '@heroui/react'
import { Share2, Copy, Check, Users, Clock, Eye, Edit, Crown, X, UserPlus, Link, Globe } from 'lucide-react'

export default function ShareBoardModal({ isOpen, onClose, board }) {
  const [invitations, setInvitations] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newInvite, setNewInvite] = useState({
    role: 'viewer',
    expiresInDays: 7,
    maxUses: null
  })
  const [copied, setCopied] = useState(null)

  // Load board data when modal opens
  useEffect(() => {
    if (isOpen && board?.id) {
      loadBoardData()
    }
  }, [isOpen, board?.id])

  const loadBoardData = async () => {
    setLoading(true)
    try {
      // Load invitations
      const inviteResponse = await fetch(`/api/boards/${board.id}/invite`)
      if (inviteResponse.ok) {
        const { invitations: inviteData } = await inviteResponse.json()
        setInvitations(inviteData || [])
      }

      // Load members
      const membersResponse = await fetch(`/api/boards/${board.id}/members`)
      if (membersResponse.ok) {
        const { members: membersData } = await membersResponse.json()
        setMembers(membersData || [])
      }
    } catch (error) {
      console.error('Error loading board data:', error)
    } finally {
      setLoading(false)
    }
  }

  const createInvitation = async () => {
    setCreating(true)
    try {
      const response = await fetch(`/api/boards/${board.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvite)
      })

      if (response.ok) {
        const invitation = await response.json()
        setInvitations(prev => [invitation, ...prev])

        // Reset form
        setNewInvite({
          role: 'viewer',
          expiresInDays: 7,
          maxUses: null
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create invitation')
      }
    } catch (error) {
      console.error('Error creating invitation:', error)
      alert('Failed to create invitation')
    } finally {
      setCreating(false)
    }
  }

  const copyInviteLink = async (token) => {
    const link = `${window.location.origin}/invite/${token}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const revokeInvitation = async (invitationId) => {
    try {
      const response = await fetch(`/api/boards/${board.id}/invite?invitationId=${invitationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to revoke invitation')
      }
    } catch (error) {
      console.error('Error revoking invitation:', error)
      alert('Failed to revoke invitation')
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown size={16} className="text-yellow-500" />
      case 'editor': return <Edit size={16} className="text-blue-500" />
      case 'viewer': return <Eye size={16} className="text-gray-500" />
      default: return null
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'warning'
      case 'editor': return 'primary'
      case 'viewer': return 'default'
      default: return 'default'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (dateString) => {
    return new Date(dateString) < new Date()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-gradient-to-t from-black/80 via-black/40 to-black/60",
        wrapper: "z-[9999]",
        closeButton: "hidden"
      }}
    >
      <ModalContent className="bg-white border border-gray-200 shadow-2xl rounded-3xl">
        {(onClose) => (
          <>
            <ModalHeader className="p-8 pb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-3xl">
              <div className="flex items-center gap-3 w-full">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Share2 size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold">Share Board</h2>
                  <p className="text-blue-100 font-normal">"{board?.name}"</p>
                </div>
                <Button
                  isIconOnly
                  variant="light"
                  className="flex items-center text-white hover:bg-white/20"
                  onPress={onClose}
                >
                  <X size={20} />
                </Button>
              </div>
            </ModalHeader>

            <ModalBody className="p-8 space-y-8">
              {/* Current Members Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Current Members</h3>
                    <p className="text-gray-600 text-sm">{members.length} people have access</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-600">Loading members...</p>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-gray-100/50">
                      <Users size={32} className="mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-900 font-medium">No members yet</p>
                      <p className="text-gray-600 text-sm">Create an invitation to start collaborating</p>
                    </div>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="p-4 bg-white/70 rounded-xl border border-gray-100/30 shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-200 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {member.user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{member.user?.name || 'Unknown User'}</p>
                              <p className="text-sm text-gray-600">{member.user?.email}</p>
                            </div>
                          </div>
                          <Chip
                            startContent={getRoleIcon(member.role)}
                            color={getRoleColor(member.role)}
                            variant="flat"
                            className="flex items-center font-semibold shadow-sm"
                          >
                            {member.role.toUpperCase()}
                          </Chip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Divider className="border-gray-200" />

              {/* Create Invitation Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <UserPlus size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Create Invitation Link</h3>
                    <p className="text-gray-600 text-sm">Generate a secure link to invite new collaborators</p>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100/50 shadow-inner">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Eye size={14} className="text-gray-500" />
                          Role Permission
                        </label>
                        <Select
                          placeholder="Select role"
                          selectedKeys={[newInvite.role]}
                          onSelectionChange={(keys) =>
                            setNewInvite(prev => ({ ...prev, role: Array.from(keys)[0] }))
                          }
                          startContent={getRoleIcon(newInvite.role)}
                          classNames={{
                            trigger: "bg-white/90 border border-gray-200 hover:border-blue-300 data-[focus=true]:border-blue-400 shadow-sm rounded-lg h-12 transition-all duration-200",
                            value: "font-medium text-gray-900 text-sm",
                            listbox: "bg-white",
                            popoverContent: "bg-white border border-gray-100 shadow-lg rounded-lg",
                            innerWrapper: "flex items-center text-gray-900",
                            label: "text-gray-900 font-medium"
                          }}
                          variant="bordered"
                          size="md"
                        >
                          <SelectItem
                            key="viewer"
                            startContent={<Eye size={14} className="text-gray-500" />}
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium",
                              description: "text-gray-500"
                            }}
                          >
                            Viewer - Read Only
                          </SelectItem>
                          <SelectItem
                            key="editor"
                            startContent={<Edit size={14} className="text-blue-500" />}
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium",
                              description: "text-gray-500"
                            }}
                          >
                            Editor - Can Edit
                          </SelectItem>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Clock size={14} className="text-gray-500" />
                          Expires In
                        </label>
                        <Select
                          placeholder="Select expiration"
                          selectedKeys={[newInvite.expiresInDays.toString()]}
                          onSelectionChange={(keys) =>
                            setNewInvite(prev => ({ ...prev, expiresInDays: parseInt(Array.from(keys)[0]) }))
                          }
                          startContent={<Clock size={14} className="text-gray-500" />}
                          classNames={{
                            trigger: "bg-white/90 border border-gray-200 hover:border-blue-300 data-[focus=true]:border-blue-400 shadow-sm rounded-lg h-12 transition-all duration-200",
                            value: "font-medium text-gray-900 text-sm",
                            listbox: "bg-white",
                            popoverContent: "bg-white border border-gray-100 shadow-lg rounded-lg",
                            innerWrapper: "flex items-center text-gray-900",
                            label: "text-gray-900 font-medium"
                          }}
                          variant="bordered"
                          size="md"
                        >
                          <SelectItem
                            key="1"
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium"
                            }}
                          >
                            1 Day
                          </SelectItem>
                          <SelectItem
                            key="7"
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium"
                            }}
                          >
                            7 Days
                          </SelectItem>
                          <SelectItem
                            key="30"
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium"
                            }}
                          >
                            30 Days
                          </SelectItem>
                          <SelectItem
                            key="365"
                            classNames={{
                              base: "text-gray-900 hover:bg-gray-50",
                              title: "text-gray-900 font-medium"
                            }}
                          >
                            1 Year
                          </SelectItem>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-900">Usage Limit (Optional)</label>
                      <Input
                        placeholder="Unlimited uses"
                        type="number"
                        min="1"
                        value={newInvite.maxUses || ''}
                        onChange={(e) => setNewInvite(prev => ({
                          ...prev,
                          maxUses: e.target.value ? parseInt(e.target.value) : null
                        }))}
                        description="Leave empty for unlimited uses"
                        classNames={{
                          input: "font-medium text-gray-900 text-sm",
                          inputWrapper: "bg-white/90 border border-gray-200 hover:border-blue-300 data-[focus=true]:border-blue-400 shadow-sm rounded-lg h-12 transition-all duration-200",
                          label: "text-gray-900 font-medium",
                          description: "text-gray-600 text-xs"
                        }}
                        variant="bordered"
                        size="md"
                      />
                    </div>

                    <Button
                      size="lg"
                      onPress={createInvitation}
                      isLoading={creating}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                      startContent={!creating && <Link size={20} className="inline-block" />}
                    >
                      {creating ? 'Creating Link...' : 'Generate Invitation Link'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Active Invitations Section */}
              {invitations.length > 0 && (
                <>
                  <Divider className="border-gray-200" />

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Globe size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Active Invitation Links</h3>
                        <p className="text-gray-600 text-sm">{invitations.length} active {invitations.length === 1 ? 'invitation' : 'invitations'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {invitations.map((invitation) => (
                        <div key={invitation.id} className="p-4 bg-white/70 rounded-xl border border-gray-100/30 shadow-sm hover:shadow-md hover:bg-white/90 transition-all duration-200 backdrop-blur-sm">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Chip
                                  startContent={getRoleIcon(invitation.role)}
                                  color={getRoleColor(invitation.role)}
                                  variant="flat"
                                  className="flex items-center font-semibold"
                                >
                                  {invitation.role.toUpperCase()}
                                </Chip>
                                {isExpired(invitation.expires_at) && (
                                  <Chip color="danger" variant="flat" className="flex items-center font-semibold">
                                    EXPIRED
                                  </Chip>
                                )}
                              </div>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="flex items-center text-red-600 hover:bg-red-50"
                                onPress={() => revokeInvitation(invitation.id)}
                              >
                                <X size={16} />
                              </Button>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <code className="text-xs text-gray-800 font-mono break-all">
                                  {`${window.location.origin}/invite/${invitation.token}`}
                                </code>
                              </div>
                              <Button
                                isIconOnly
                                variant="flat"
                                onPress={() => copyInviteLink(invitation.token)}
                                className={`flex items-center shadow-sm transition-all duration-200 ${copied === invitation.token
                                  ? 'flex items-center bg-green-100 text-green-700 border-green-200'
                                  : 'flex items-center bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                  }`}
                              >
                                {copied === invitation.token ? <Check size={16} /> : <Copy size={16} />}
                              </Button>
                            </div>

                            <div className="flex justify-between text-xs text-black bg-gray-50/80 p-2 rounded-lg font-medium">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Expires: {formatDate(invitation.expires_at)}
                              </span>
                              <span>
                                Used: {invitation.used_count}
                                {invitation.max_uses && ` / ${invitation.max_uses}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
