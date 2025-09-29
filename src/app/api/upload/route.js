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
    console.log('📤 POST /api/upload - Starting API upload request');

    const form = await request.formData()
    const file = form.get('file')
    const bucket = form.get('bucket') || DEFAULT_BUCKET
    const boardId = form.get('boardId') || 'shared'
    const userId = form.get('userId') || 'anonymous'
    const kind = form.get('kind') || 'file'

    console.log('📦 Upload API request parameters:', {
      fileName: file?.name,
      fileSize: file?.size,
      bucket,
      boardId,
      userId,
      kind
    });

    if (!file || typeof file === 'string') {
      console.log('❌ No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1)
      console.log('❌ File too large:', mb + 'MB');
      return NextResponse.json({ error: `File too large (${mb}MB). Max is 50MB.` }, { status: 400 })
    }

    // Build path
    const folder = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files'
    const timestamp = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const safeName = sanitizeFilename(file.name || `${folder}-${timestamp}`)
    const path = `${userId}/${boardId}/${folder}/${timestamp}-${rand}-${safeName}`

    console.log('📁 Generated file path:', { bucket, path });

    // Verify bucket exists
    try {
      const { error: bucketError } = await supabaseAdmin.storage.getBucket(bucket);
      if (bucketError) {
        console.log('❌ Bucket verification failed:', bucketError);
        return NextResponse.json({
          error: `Bucket '${bucket}' not found or inaccessible: ${bucketError.message}`
        }, { status: 400 });
      }
      console.log('✅ Bucket verified:', bucket);
    } catch (bucketCheckError) {
      console.log('⚠️ Bucket check failed (continuing anyway):', bucketCheckError);
    }

    // Convert to Buffer/Uint8Array for Node upload
    const arrayBuffer = await file.arrayBuffer()
    const contentType = file.type || undefined
    const bytes = new Uint8Array(arrayBuffer)

    console.log('⬆️ Uploading to Supabase storage...');
    const { error } = await supabaseAdmin
      .storage
      .from(bucket)
      .upload(path, bytes, {
        cacheControl: '31536000',
        contentType,
        upsert: false,
      })

    if (error) {
      console.log('❌ Upload failed:', error);
      return NextResponse.json({
        error: error.message || 'Upload failed',
        details: error
      }, { status: 500 });
    }

    console.log('✅ File uploaded successfully');

    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const publicUrl = pub?.publicUrl

    console.log('🌐 Public URL generated:', publicUrl);

    return NextResponse.json({ bucket, path, publicUrl, url: publicUrl })
  } catch (err) {
    console.error('💥 Upload API route error:', err);
    return NextResponse.json({
      error: err?.message || 'Unexpected error',
      stack: err?.stack
    }, { status: 500 });
  }
}

