"use client"

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
  Avatar,
  Divider
} from '@heroui/react'
import { Share2, Eye, Edit, Crown, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function InvitePage({ params }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const { token } = use(params)

  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      const response = await fetch(`/api/invite/${token}`)

      if (response.ok) {
        const data = await response.json()
        setInvitation(data)
      } else {
        const error = await response.json()
        setError(error.error || 'Invitation not found')
      }
    } catch (err) {
      console.error('Error loading invitation:', err)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!session) {
      const callbackUrl = encodeURIComponent(window.location.href)
      router.push(`/login?callbackUrl=${callbackUrl}`)
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(result.message)

        // Redirect to the board after a short delay
        setTimeout(() => {
          router.push(`/dashboard`)
        }, 2000)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to accept invitation')
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner': return <Crown size={20} className="text-yellow-500" />
      case 'editor': return <Edit size={20} className="text-black-500" />
      case 'viewer': return <Eye size={20} className="text-black-500" />
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

  const getRoleDescription = (role) => {
    switch (role) {
      case 'owner': return 'Full access - can manage board and members'
      case 'editor': return 'Can edit board content and invite others'
      case 'viewer': return 'Read-only access to view board content'
      default: return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center space-y-4">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold text-red-600">Invalid Invitation</h1>
            <p className="text-gray-600">{error}</p>
            <Button
              color="primary"
              onPress={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center space-y-4">
            <CheckCircle size={48} className="text-green-500 mx-auto" />
            <h1 className="text-xl font-semibold text-green-600">Success!</h1>
            <p className="text-gray-600">{success}</p>
            <p className="text-sm text-gray-500">Redirecting to board...</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center space-y-4">
            <AlertCircle size={48} className="text-gray-500 mx-auto" />
            <h1 className="text-xl font-semibold">Invitation Not Found</h1>
            <p className="text-gray-600">This invitation link is invalid or has expired.</p>
            <Button
              color="primary"
              onPress={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  const isExpired = invitation.isExpired
  const canUse = invitation.canUse

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
      {/* Background decoration to match other pages */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="max-w-lg w-full relative z-10 backdrop-blur-md bg-white/90 border border-white/40 shadow-2xl rounded-3xl">
        <CardHeader className="text-center pb-6 p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-3xl border-b border-gray-100/50">
          <div className="w-full space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Share2 size={36} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Board Invitation</h1>
              <p className="text-gray-600 font-medium">You've been invited to collaborate</p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-8 p-8">
          {/* Board Info */}
          <div className="text-center space-y-3 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-2xl border border-blue-100/30">
            <h2 className="text-2xl font-bold text-gray-900">{invitation.boardName}</h2>
            <p className="text-gray-600">
              Invited by <span className="font-semibold text-blue-600">{invitation.inviterName}</span>
            </p>
          </div>

          <Divider className="border-gray-200" />

          {/* Role Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Chip
                startContent={getRoleIcon(invitation.role)}
                color={getRoleColor(invitation.role)}
                variant="flat"
                size="lg"
                className="px-6 py-3 font-bold text-base shadow-sm"
              >
                {invitation.role.toUpperCase()}
              </Chip>
            </div>
            <p className="text-center text-gray-600 font-medium bg-gray-50/80 p-3 rounded-xl">
              {getRoleDescription(invitation.role)}
            </p>
          </div>

          {/* Expiration Info */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 bg-gray-50/50 p-3 rounded-xl">
            <Clock size={18} />
            <span className="font-medium">
              {isExpired ?
                'Expired' :
                `Expires ${new Date(invitation.expiresAt).toLocaleString()}`
              }
            </span>
          </div>

          {/* Status Messages */}
          {isExpired && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <p className="text-red-700 font-medium">
                  This invitation has expired and can no longer be used.
                </p>
              </div>
            </div>
          )}

          {!canUse && !isExpired && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <p className="text-yellow-700 font-medium">
                  This invitation has reached its maximum number of uses.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {!isExpired && canUse && (
              <>
                {status === 'loading' ? (
                  <div className="text-center p-6">
                    <div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 font-medium">Checking authentication...</p>
                  </div>
                ) : !session ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <p className="text-center text-gray-700 font-medium">
                        You need to sign in to accept this invitation
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-2xl h-14"
                      onPress={() => {
                        const callbackUrl = encodeURIComponent(window.location.href)
                        router.push(`/login?callbackUrl=${callbackUrl}`)
                      }}
                    >
                      Sign In to Accept
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-2xl h-14"
                    onPress={acceptInvitation}
                    isLoading={accepting}
                    startContent={!accepting && <CheckCircle size={20} />}
                  >
                    {accepting ? 'Accepting Invitation...' : 'Accept Invitation'}
                  </Button>
                )}
              </>
            )}

            <Button
              variant="bordered"
              size="lg"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium transition-all duration-300 hover:shadow-md rounded-2xl h-12"
              onPress={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}