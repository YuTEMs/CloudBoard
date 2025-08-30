"use client"

import { Button, Input, Card, CardBody } from "@heroui/react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppHeader } from "../../components/layout/app-hearder"

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
        setSuccess('Account created successfully! Redirecting to login...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <AppHeader title="Create Account" showBack backHref="/login" />

      <div className="flex items-center justify-center p-4 pt-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-green-400/20 rounded-full blur-3xl"></div>
        </div>

        <Card className="w-full max-w-md card-elevated fade-in relative z-10 backdrop-blur-sm bg-white/80">
          <CardBody className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">✨</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Us</h1>
              <p className="text-gray-600">Create your account to get started</p>
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
                    inputWrapper: "border-gray-200 hover:border-purple-300 focus-within:border-purple-500 bg-white transition-all duration-200"
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
                    inputWrapper: "border-gray-200 hover:border-purple-300 focus-within:border-purple-500 bg-white transition-all duration-200"
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
                    inputWrapper: "border-gray-200 hover:border-purple-300 focus-within:border-purple-500 bg-white transition-all duration-200"
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
                    inputWrapper: "border-gray-200 hover:border-purple-300 focus-within:border-purple-500 bg-white transition-all duration-200"
                  }}
                />
              </div>

              <div className="pt-6">
                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 font-medium py-3 transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  isLoading={isLoading}
                  disabled={isLoading || !email || !username || !password}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-600 pt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-purple-600 hover:text-purple-800 font-medium transition-colors duration-200">
                  Sign in here
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
