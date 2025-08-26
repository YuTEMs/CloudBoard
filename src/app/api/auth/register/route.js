import { authService } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, username, password, name } = await request.json()

    // Validate input
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Email, username, and password are required' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Register user
    const user = await authService.registerUser({
      email,
      username,
      password,
      name
    })

    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration API error:', error)
    
    if (error.message === 'User already exists with this email') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
