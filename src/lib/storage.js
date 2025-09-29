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
  console.log('📤 uploadMedia called with:', {
    fileName: file?.name,
    fileSize: file?.size,
    bucket,
    boardId,
    userId,
    kind,
    USE_SIGNED_UPLOAD,
    USE_API_UPLOAD
  });

  if (!file) throw new Error('No file provided')
  if (isTooLarge(file)) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(`File too large (${mb}MB). Max is 50MB.`)
  }
  // Prefer signed direct-to-storage uploads for speed (bypasses Vercel for file bytes)
  if (USE_SIGNED_UPLOAD) {
    console.log('🔐 Attempting signed upload...');
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
      console.log('📋 Sign upload response:', { status: res.status, payload });

      if (!res.ok) throw new Error(payload?.error || 'Failed to sign upload')

      const { path, token, bucket: bkt, publicUrl } = payload
      if (!token || !path) throw new Error('Invalid signed upload response')

      console.log('⬆️ Uploading to signed URL...');
      const { error: upErr } = await supabase
        .storage
        .from(bkt || bucket)
        .uploadToSignedUrl(path, token, file)

      if (upErr) throw upErr

      console.log('✅ Signed upload successful:', { bucket: bkt || bucket, publicUrl });
      return { bucket: bkt || bucket, path, publicUrl }
    } catch (e) {
      console.log('❌ Signed upload failed, falling back to API upload:', e.message);
      // Fall back to API upload below
    }
  }

  // Fall back: API upload (service role) to avoid RLS issues
  if (USE_API_UPLOAD) {
    console.log('🔄 Attempting API upload fallback...');
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
    console.log('📋 API upload response:', { status: res.status, payload });

    if (!res.ok) {
      console.log('❌ API upload failed:', payload);
      throw new Error(payload?.error || 'Upload failed')
    }
    console.log('✅ API upload successful:', payload);
    return payload
  }

  // Final fallback: direct client upload (requires permissive RLS on storage.objects)
  console.log('🔄 Attempting direct client upload (final fallback)...');
  const folder = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files'
  const timestamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const safeName = sanitizeFilename(file.name || `${folder}-${timestamp}`)
  const path = `${userId}/${boardId}/${folder}/${timestamp}-${rand}-${safeName}`

  console.log('📁 Direct upload path:', { bucket, path });

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

    console.log('✅ Direct upload successful');
  } catch (err) {
    console.log('❌ Direct upload failed, trying final API fallback:', err.message);
    // Fallback to API route if RLS blocks direct upload
    const form = new FormData()
    form.append('file', file)
    form.append('bucket', bucket)
    form.append('boardId', boardId)
    form.append('userId', userId)
    form.append('kind', kind)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const payload = await res.json().catch(() => ({}))
    console.log('📋 Final API fallback response:', { status: res.status, payload });

    if (!res.ok) {
      const message = payload?.error || (err?.message || 'Upload failed')
      console.log('💥 All upload methods failed:', message);
      throw new Error(message)
    }
    console.log('✅ Final API fallback successful:', payload);
    return payload
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = pub?.publicUrl;
  console.log('✅ Direct upload completed:', { bucket, publicUrl });
  return { bucket, path, publicUrl }
}

export async function deleteMedia({ bucket = DEFAULT_BUCKET, path }) {
  if (!path) return { error: null }
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error }
}
