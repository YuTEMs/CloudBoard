import GoogleProvider from "next-auth/providers/google"
import { userService } from "@/lib/supabase"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        
        if (account?.provider === 'google') {
          // Generate a unique user ID for Supabase
          const supabaseUserId = `google_${user.id}` || `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          console.log('📝 Attempting to store user in Supabase...')
          
          // Store/update user in Supabase
          const userData = await userService.upsertUser({
            id: supabaseUserId,
            email: user.email,
            name: user.name,
            username: user.email?.split('@')[0] || user.name?.toLowerCase().replace(/\s+/g, '') || 'user',
            image: user.image,
            provider: 'google',
            created_at: new Date().toISOString()
          })
          
          // Store the Supabase user ID in the NextAuth user object
          user.id = supabaseUserId
          
          return true
        }
        
        return true
      } catch (error) {
        console.error('❌ SignIn callback error:', error)
        // Still allow sign in even if Supabase fails
        return true
      }
    },
    
    async jwt({ token, user, account, profile }) {
      // If user exists (first login), store user info in token
      if (user) {
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
      }
      
      // For Google OAuth, ensure we preserve the image
      if (account?.provider === 'google' && profile) {
        token.name = profile.name
        token.email = profile.email
        token.image = profile.picture || profile.image
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Pass user data to session
      if (token?.sub) {
        session.user.id = token.sub
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.image
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
  },
}
