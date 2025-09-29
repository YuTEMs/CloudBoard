import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'upload-media'
const MAX_BYTES = 50 * 1024 * 1024 // 50MB

function sanitizeFilename(name) {
  return (name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$|^\.+/g, '')
}

export async function POST(request) {
  try {

    const form = await request.formData()
    const file = form.get('file')
    const bucket = form.get('bucket') || DEFAULT_BUCKET
    const boardId = form.get('boardId') || 'shared'
    const userId = form.get('userId') || 'anonymous'
    const kind = form.get('kind') || 'file'


    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      return NextResponse.json({ error: `File too large (${mb}MB). Max is 50MB.` }, { status: 400 })
    }

    // Build path
    const folder = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files'
    const timestamp = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const safeName = sanitizeFilename(file.name || `${folder}-${timestamp}`)
    const path = `${userId}/${boardId}/${folder}/${timestamp}-${rand}-${safeName}`


    // Verify bucket exists
    try {
      const { error: bucketError } = await supabaseAdmin.storage.getBucket(bucket);
      if (bucketError) {
        return NextResponse.json({
          error: `Bucket '${bucket}' not found or inaccessible: ${bucketError.message}`
        }, { status: 400 });
      }
    } catch (bucketCheckError) {
    }

    // Convert to Buffer/Uint8Array for Node upload
    const arrayBuffer = await file.arrayBuffer()
    const contentType = file.type || undefined
    const bytes = new Uint8Array(arrayBuffer)

    const { error } = await supabaseAdmin
      .storage
      .from(bucket)
      .upload(path, bytes, {
        cacheControl: '31536000',
        contentType,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({
        error: error.message || 'Upload failed',
        details: error
      }, { status: 500 });
    }


    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const publicUrl = pub?.publicUrl


    return NextResponse.json({ bucket, path, publicUrl, url: publicUrl })
  } catch (err) {
    return NextResponse.json({
      error: err?.message || 'Unexpected error',
      stack: err?.stack
    }, { status: 500 });
  }
}

