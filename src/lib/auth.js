import { userService } from './supabase'
import bcrypt from 'bcryptjs'

export const authService = {
  // Register new user with email/password
  async registerUser(userData) {
    try {
      const { email, username, password, name } = userData
      
      // Check if user already exists
      const existingUser = await userService.getUserByEmail(email)
      if (existingUser) {
        throw new Error('User already exists with this email')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user in Supabase
      const newUser = await userService.upsertUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        username,
        name: name || username,
        password_hash: hashedPassword,
        provider: 'email',
        created_at: new Date().toISOString()
      })

      // Don't return password hash
      const { password_hash, ...userWithoutPassword } = newUser
      return userWithoutPassword
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Verify user credentials
  async verifyCredentials(email, password) {
    try {
      const user = await userService.getUserByEmail(email)
      if (!user || !user.password_hash) {
        return null
      }

      const isValid = await bcrypt.compare(password, user.password_hash)
      if (!isValid) {
        return null
      }

      // Don't return password hash
      const { password_hash, ...userWithoutPassword } = user
      return userWithoutPassword
    } catch (error) {
      console.error('Credential verification error:', error)
      return null
    }
  },

  // Update user password
  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await userService.updateUser(userId, { 
        password_hash: hashedPassword 
      })
      return true
    } catch (error) {
      console.error('Password update error:', error)
      throw error
    }
  }
}
