// Generate a secure room ID (used for board IDs)
export function generateRoomId() {
  // Create a long, unguessable room ID
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      const timestamp = Date.now().toString(36)
      const randomPart = crypto.randomUUID().replace(/-/g, '')
      return `${timestamp}-${randomPart}`
    } else {
      // Fallback for environments without crypto.randomUUID
      const timestamp = Date.now().toString(36)
      const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      return `${timestamp}-${randomPart}`
    }
  } catch (error) {
    // Ultimate fallback
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${randomPart}`
  }
}