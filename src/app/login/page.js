"use client"

import { Button, Input, Card, CardBody } from "@heroui/react"
import { useState } from "react"
import Link from "next/link"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

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
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                variant="bordered"
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
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/signup" className="flex-1">
                <Button variant="bordered" className="w-full border-black text-black hover:bg-black hover:text-white">
                  Signup
                </Button>
              </Link>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-black text-white hover:bg-gray-800">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
