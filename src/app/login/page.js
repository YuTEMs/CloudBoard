"use client"

import { Button, Input, Card, CardBody, Divider } from "@heroui/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  const handleManualLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // For manual login, you might want to create a custom session
        // For now, redirect to dashboard - you may need to implement custom session management
        router.push('/dashboard')
      } else {
        if (response.status === 401) {
          setError(
            <div>
              User not found or invalid credentials.{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-800 underline">
                Create an account
              </Link>
            </div>
          )
        } else {
          setError(data.error || 'Login failed')
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md border-2 border-black">
        <CardBody className="p-8">
          <div className="text-center mb-8">
            <div className="w-32 h-24 mx-auto mb-4 bg-black rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">LOGO</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Google Sign In Button */}
            <Button
              onClick={handleGoogleSignIn}
              variant="bordered"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 py-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC04" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium">Continue with Google</span>
            </Button>

            <div className="flex items-center my-4">
              <Divider className="flex-1" />
              <span className="px-4 text-sm text-gray-500">or</span>
              <Divider className="flex-1" />
            </div>

            <form onSubmit={handleManualLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  variant="bordered"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-black">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  variant="bordered"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/signup" className="flex-1">
                  <Button variant="bordered" className="w-full border-black text-black hover:bg-black hover:text-white">
                    Signup
                  </Button>
                </Link>
                <Button 
                  type="submit"
                  className="flex-1 bg-black text-white hover:bg-gray-800"
                  isLoading={isLoading}
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
