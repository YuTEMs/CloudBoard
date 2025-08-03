"use client"

import { Button, Input, Card, CardBody } from "@heroui/react"
import { useState } from "react"
import Link from "next/link"
import { AppHeader } from "../../components/layout/app-hearder"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Sign Up" showBack backHref="/login" />

      <div className="flex items-center justify-center p-4 pt-8">
        <Card className="w-full max-w-md">
          <CardBody className="p-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  variant="bordered"
                />
              </div>

              <div className="pt-4">
                <Link href="/dashboard">
                  <Button color="primary" className="w-full">
                    Confirm
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
