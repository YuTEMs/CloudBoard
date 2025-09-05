"use client"

import { Button, Input, Card, CardBody } from "@heroui/react"
import { ClipboardList } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleSignup = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          name: name || username
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Auto-sign in with credentials so the user can start using the app
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
          callbackUrl: '/dashboard'
        })

        if (result?.error) {
          setSuccess('Account created successfully! Please sign in.')
          router.push('/login')
        } else {
          router.push(result?.url || '/dashboard')
        }
      } else {
        setError(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Signup error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 relative">
      {/* Background decoration to match login */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-md bg-white/90 border border-white/40 shadow-xl rounded-3xl">
        <CardBody className="p-8">
          <div className="mb-8">
            <div className="w-20 h-20 mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
              <ClipboardList className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">Create Account</h1>
            <p className="text-gray-600 text-center">Sign up to start organizing boards</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm slide-in">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    </div>
                    {error}
                  </div>
                </div>
              )}
              
              {success && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm slide-in">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-200 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    {success}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  variant="bordered"
                  required
                  classNames={{
                    input: "text-gray-900",
                    inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/90 backdrop-blur-sm rounded-xl transition-all duration-200"
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Full Name (Optional)</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  variant="bordered"
                  classNames={{
                    input: "text-gray-900",
                    inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/90 backdrop-blur-sm rounded-xl transition-all duration-200"
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  variant="bordered"
                  required
                  classNames={{
                    input: "text-gray-900",
                    inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/90 backdrop-blur-sm rounded-xl transition-all duration-200"
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password (min. 6 characters)"
                  variant="bordered"
                  required
                  classNames={{
                    input: "text-gray-900",
                    inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-500 bg-white/90 backdrop-blur-sm rounded-xl transition-all duration-200"
                  }}
                />
              </div>

              <div className="pt-6">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-medium py-3 transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                  isLoading={isLoading}
                  disabled={isLoading || !email || !username || !password}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-600 pt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                  Sign in here
                </Link>
              </div>
            </form>
        </CardBody>
      </Card>
    </div>
  )
}
