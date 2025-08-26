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
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Sign Up" showBack backHref="/login" />

      <div className="flex items-center justify-center p-4 pt-8">
        <Card className="w-full max-w-md">
          <CardBody className="p-8">
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 rounded-lg bg-green-100 border border-green-300 text-green-700 text-sm">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
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
                <label className="block text-sm font-medium mb-2">Name (Optional)</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  variant="bordered"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  variant="bordered"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min. 6 characters)"
                  variant="bordered"
                  required
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit"
                  color="primary" 
                  className="w-full"
                  isLoading={isLoading}
                  disabled={isLoading || !email || !username || !password}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
              
              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-800">
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
