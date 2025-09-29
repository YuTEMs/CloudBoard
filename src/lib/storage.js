import { supabase } from './supabase'

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'upload-media'
const MAX_BYTES = 50 * 1024 * 1024 // 50MB
const USE_API_UPLOAD = process.env.NEXT_PUBLIC_USE_API_UPLOAD !== 'false'
const USE_SIGNED_UPLOAD = process.env.NEXT_PUBLIC_USE_SIGNED_UPLOAD !== 'false'

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$|^\.+/g, '')
}

export function isTooLarge(file) {
  return file?.size > MAX_BYTES
}

export async function uploadMedia(file, {
  bucket = DEFAULT_BUCKET,
  boardId = 'shared',
  userId = 'anonymous',
  kind = 'file', // 'image' | 'video' | 'file'
} = {}) {

  if (!file) throw new Error('No file provided')
  if (isTooLarge(file)) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`File too large (${mb}MB). Max is 50MB.`)
  }
  // Prefer signed direct-to-storage uploads for speed (bypasses Vercel for file bytes)
  if (USE_SIGNED_UPLOAD) {
    try {
      const res = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket,
          boardId,
          userId,
          kind,
          filename: file.name || 'file',
        })
      })
      const payload = await res.json()

      if (!res.ok) throw new Error(payload?.error || 'Failed to sign upload')

      const { path, token, bucket: bkt, publicUrl } = payload
      if (!token || !path) throw new Error('Invalid signed upload response')

      const { error: upErr } = await supabase
        .storage
        .from(bkt || bucket)
        .uploadToSignedUrl(path, token, file)

      if (upErr) throw upErr

      return { bucket: bkt || bucket, path, publicUrl }
    } catch (e) {
      // Fall back to API upload below
    }
  }

  // Fall back: API upload (service role) to avoid RLS issues
  if (USE_API_UPLOAD) {
    const form = new FormData()
    form.append('file', file)
    form.append('bucket', bucket)
    form.append('boardId', boardId)
    form.append('userId', userId)
    form.append('kind', kind)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(payload?.error || 'Upload failed')
    }
    return payload
  }

  // Final fallback: direct client upload (requires permissive RLS on storage.objects)
  const folder = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files'
  const timestamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const safeName = sanitizeFilename(file.name || `${folder}-${timestamp}`)
  const path = `${userId}/${boardId}/${folder}/${timestamp}-${rand}-${safeName}`


  try {
    const { error } = await supabase
      .storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || undefined,
        upsert: false,
      })
    if (error) throw error

  } catch (err) {
    // Fallback to API route if RLS blocks direct upload
    const form = new FormData()
    form.append('file', file)
    form.append('bucket', bucket)
    form.append('boardId', boardId)
    form.append('userId', userId)
    form.append('kind', kind)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message = payload?.error || (err?.message || 'Upload failed')
      throw new Error(message)
    }
    return payload
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = pub?.publicUrl;
  return { bucket, path, publicUrl }
}

export async function deleteMedia({ bucket = DEFAULT_BUCKET, path }) {
  if (!path) return { error: null }
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error }
}
