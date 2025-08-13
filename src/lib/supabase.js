import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create Supabase client with anon key (read-only)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Generate a secure room ID
export function generateRoomId() {
  // Create a long, unguessable room ID
  const timestamp = Date.now().toString(36)
  const randomPart = crypto.randomUUID().replace(/-/g, '')
  return `${timestamp}-${randomPart}`
}

// Bucket configuration
export const MEDIA_BUCKET = 'media'
export const MANIFESTS_BUCKET = 'manifests'

// Backend URL configuration for Vercel deployment
export const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_BACKEND_URL || '/api'  // Vercel routes /api to Python backend
  : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
