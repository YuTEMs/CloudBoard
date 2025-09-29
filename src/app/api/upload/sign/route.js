import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const DEFAULT_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET || 'upload-media'

function sanitizeFilename(name) {
  return (name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$|^\.+/g, '')
}

export async function POST(request) {
  try {
    console.log('🔑 POST /api/upload/sign - Starting signed upload request');

    const contentType = request.headers.get('content-type') || ''
    let body
    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      const form = await request.formData()
      body = Object.fromEntries(form.entries())
    }

    const {
      bucket = DEFAULT_BUCKET,
      boardId = 'shared',
      userId = 'anonymous',
      kind = 'file',
      filename = 'file',
    } = body || {}

    console.log('📦 Upload sign request parameters:', { bucket, boardId, userId, kind, filename });

    const folder = kind === 'image' ? 'images' : kind === 'video' ? 'videos' : 'files'
    const timestamp = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const safeName = sanitizeFilename(filename)
    const path = `${userId}/${boardId}/${folder}/${timestamp}-${rand}-${safeName}`

    console.log('📁 Generated file path:', { bucket, path });

    // Verify bucket exists by attempting to list it
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

    // Create a short-lived signed upload URL (default expiry ~1 min)
    console.log('🔐 Creating signed upload URL...');
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error) {
      console.log('❌ Signed upload URL creation failed:', error);
      return NextResponse.json({
        error: error.message || 'Failed to create signed URL',
        details: error
      }, { status: 500 });
    }

    console.log('📋 Signed upload URL created:', { token: !!data?.token, hasSignedUrl: !!data?.signedUrl });

    // Also return the public URL for convenience
    const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const publicUrl = pub?.publicUrl

    console.log('🌐 Public URL generated:', publicUrl);

    return NextResponse.json({
      bucket,
      path,
      token: data?.token,
      signedUrl: data?.signedUrl,
      publicUrl,
    })
  } catch (err) {
    console.error('💥 Upload sign route error:', err);
    return NextResponse.json({
      error: err?.message || 'Unexpected error',
      stack: err?.stack
    }, { status: 500 });
  }
}

