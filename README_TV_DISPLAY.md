# TV Display Control System

A complete solution for remotely controlling TV displays using Supabase Realtime Channels and Storage. Upload images and videos from one device and instantly display them on remote screens.

## Architecture

### Frontend (Next.js)
- **Uploader Page** (`/upload`): Upload media files, create playlists, and broadcast updates
- **Display Page** (`/display`): Fullscreen media playback with real-time updates

### Backend (Python FastAPI)
- **Upload Endpoint** (`/upload`): Handle file uploads to Supabase Storage
- **Save Manifest Endpoint** (`/save-manifest`): Store playlist manifests

### Supabase Services
- **Storage**: Two buckets (`media` and `manifests`) for files and playlists
- **Realtime**: Instant playlist updates via channels

## Features

### Uploader Features
- ✅ Multi-file drag & drop upload
- ✅ Secure room ID generation
- ✅ Real-time manifest broadcasting
- ✅ Playlist versioning with conflict resolution
- ✅ Progress tracking and status updates
- ✅ One-click display URL sharing

### Display Features
- ✅ Fullscreen media playback
- ✅ Auto-advancing slideshow (8s images, full video duration)
- ✅ Real-time playlist updates
- ✅ Media preloading for smooth transitions
- ✅ Automatic reconnection handling
- ✅ Stale manifest protection
- ✅ Error handling with graceful fallbacks

### Security
- ✅ Long, unguessable room IDs
- ✅ Read-only anon key for display pages
- ✅ Service role key only in backend
- ✅ CORS protection

## Quick Setup

### 1. Supabase Configuration

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Create two storage buckets:
   - `media` (public read access)
   - `manifests` (public read access, cache-control: no-cache)
3. Get your project URL and keys from Settings > API

### 2. Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

**Backend (api/.env):**
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_MEDIA_BUCKET=media
SUPABASE_MANIFESTS_BUCKET=manifests
```

### 3. Installation & Running

**Frontend:**
```bash
npm install
npm run dev
```
Access at http://localhost:3000

**Backend:**
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Access at http://localhost:8000

### 4. Docker Deployment (Backend)

```bash
cd api
docker build -t tv-display-backend .
docker run -p 8000:8000 --env-file .env tv-display-backend
```

## Usage

### Setting Up a Display

1. **Generate Room**: Go to `/upload` to generate a secure room ID
2. **Get Display URL**: Copy the generated display URL
3. **Open Display**: Open the display URL on your TV/display device in fullscreen
4. **Upload Content**: Use the upload interface to add images and videos
5. **Instant Updates**: Content appears immediately on the display

### Managing Content

- **Supported Formats**: Images (JPG, PNG, GIF), Videos (MP4, MOV, AVI)
- **Timing**: Images show for 8 seconds, videos play full duration
- **Updates**: New uploads replace the entire playlist instantly
- **Versioning**: Only newer manifest versions are applied

## API Endpoints

### POST /upload
Upload multiple files to a room.

**Request:**
```
Form Data:
- room: string (room ID)
- files: file[] (media files)
```

**Response:**
```json
[
  {"type": "image", "url": "https://..."},
  {"type": "video", "url": "https://..."}
]
```

### POST /save-manifest
Save playlist manifest to storage.

**Request:**
```json
{
  "room": "room-id",
  "version": 1,
  "items": [
    {"type": "image", "url": "https://..."},
    {"type": "video", "url": "https://..."}
  ]
}
```

**Response:**
```json
{
  "message": "Manifest saved successfully",
  "url": "https://...",
  "version": 1
}
```

## Technical Details

### Realtime Flow
1. Upload files via `/upload` endpoint
2. Create manifest with incremented version
3. Broadcast manifest via Supabase Realtime
4. Save manifest to Storage via `/save-manifest`
5. Display page receives broadcast and updates playlist

### Error Handling
- **Connection Issues**: Automatic reconnection on page visibility change
- **Media Errors**: Skip failed items and continue playlist
- **Stale Manifests**: Version checking prevents conflicts
- **Network Issues**: Graceful degradation with error messages

### Performance
- **Media Preloading**: All media preloaded before playlist updates
- **Atomic Updates**: Playlist changes are instantaneous
- **Efficient Storage**: Public buckets for direct media access
- **Minimal Polling**: Real-time updates eliminate polling

## Production Deployment

### Frontend (Vercel/Netlify)
1. Build and deploy Next.js app
2. Set environment variables in deployment platform
3. Update CORS origins in backend

### Backend (AWS/GCP/Railway)
1. Deploy using Docker or direct deployment
2. Set environment variables
3. Update CORS origins for production domain
4. Use HTTPS for secure connections

### Supabase
1. Ensure storage buckets are properly configured
2. Set up proper access policies
3. Monitor usage and scaling

## Troubleshooting

**Display not updating:**
- Check room ID matches between upload and display
- Verify Supabase Realtime connection status
- Check browser console for connection errors

**Upload failures:**
- Verify backend is running and accessible
- Check Supabase service key permissions
- Ensure storage buckets exist and are accessible

**Media not playing:**
- Check file formats are supported
- Verify media URLs are accessible
- Check browser media permissions

## License

MIT License - feel free to use in your projects!
