# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudBoard (formerly Smart Bulletin Board) is a real-time digital bulletin board system built with Next.js 15 and Supabase. It allows users to create and display dynamic content across multiple displays with real-time synchronization using Server-Sent Events (SSE).

## Commands

### Development
```bash
npm run dev      # Start development server with turbopack (http://localhost:3000)
npm run build    # Production build
npm start        # Run production server
npm run lint     # Run ESLint
npm run email    # Email development preview
```

### Testing
Chrome browser is recommended for development and testing. The application is optimized for digital signage use cases.

## Architecture

### Authentication System
- **NextAuth.js** with dual providers: Google OAuth and email/password credentials
- Custom credential provider in `src/lib/auth-options.js` using bcrypt for password hashing
- User IDs prefixed by provider (`google_` for OAuth users)
- User data stored in Supabase `users` table via `userService` (`src/lib/supabase.js`)

### Real-Time Synchronization
The app uses **Server-Sent Events (SSE)** for real-time board updates across multiple displays:

1. **Stream Manager** (`src/lib/stream-manager.js`): Manages active SSE connections per board
   - Tracks connections with metadata (connection time, last ping)
   - Broadcasts updates to all connected displays via `broadcastToBoard()`
   - Handles connection cleanup and keep-alive pings (every 30 seconds)

2. **SSE Endpoint** (`src/app/api/stream/route.js`): Creates persistent connections for each display

3. **Client Hook** (`src/hooks/useRealtimeBoards.js`): Manages board state and real-time updates
   - Handles localStorage migration to Supabase on first load
   - Subscribes to board-specific SSE streams
   - Automatically refetches board data on stream updates

### Board State Management
- Boards contain items: widgets, images, videos, and advertisements
- Each board has access controls (owner, editors, viewers) stored in `board_access` table
- State is persisted to Supabase and cached using custom cache layer (`src/lib/cache.js`)
- Cache uses TTL and LRU eviction strategies (default 1 minute TTL, max 100 entries)

### Widget System
Located in `src/components/widgets/`:
- **WidgetRegistry.tsx**: Central registry for all widget types with config and rendering logic
- **BaseWidget.tsx**: Common wrapper for all widgets with mode handling (organize/display)
- Available widgets:
  - **TimeWidget**: Displays current time/date with customizable format
  - **WeatherWidget**: Shows weather using Open-Meteo API (geocoding via `src/lib/geocoding-api.ts`, weather via `src/lib/weather-api.ts`)
  - **SlideshowWidget**: Rotates through images/videos with configurable duration
  - **AnnouncementWidget**: Time-based text announcements (currently disabled in rendering, see line 74 of WidgetRegistry.tsx)

Each widget supports two modes:
- **Organize mode**: Edit configuration, resize, reposition
- **Display mode**: View-only, optimized for presentation

### Database Layer
`src/lib/supabase.js` and `src/lib/supabase-admin.js` provide services for:
- `userService`: User CRUD operations
- `boardService`: Board and item management with automatic cache invalidation
- `inviteService`: Board invitation system with email notifications (uses Resend API)
- `advertisementService`: Advertisement media management

Key tables:
- `users`: User profiles with authentication data
- `boards`: Board metadata (name, description, settings, owner)
- `board_items`: Items on boards (widgets, images, videos) with position/size/z-index
- `board_access`: Granular access control (owner/editor/viewer roles)
- `advertisements`: Advertisement content with scheduling

### File Storage
- Supabase Storage buckets: `upload-media` (user uploads), `advertisement-media` (ads)
- `src/lib/storage.js` handles uploads with 50MB limit, automatic cleanup on item deletion
- Security: Row-level security (RLS) policies enforce access control
- Images configured in `next.config.ts` with remote patterns for Supabase and OAuth providers

### UI Pages
- `/dashboard`: Main board management interface
- `/organize/[boardId]`: Canvas editor with drag-drop, resize, rotation tools
  - `CanvasArea.jsx`: Main editing canvas
  - `ToolsPanel.jsx`: Add widgets, upload media, manage advertisements
  - `PropertiesPanel.jsx`: Configure selected item properties
  - `ContextPanel.jsx`: Widget-specific configuration
- `/display/[boardId]`: Fullscreen display mode for digital signage with optional person detection
- `/invite/[token]`: Board invitation acceptance flow

### Person Detection (Display Mode Feature)
- Uses TensorFlow.js with COCO-SSD model for person detection via webcam
- Hook: `src/hooks/usePersonDetection.js` provides person count, loading states
- Can be enabled per display for audience analytics
- Model loads on-demand only when feature is enabled

### Environment Variables
Required in `.env.local`:
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`: NextAuth configuration
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase connection
- `NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET`, `NEXT_PUBLIC_SUPABASE_ADVERTISEMENT_BUCKET`: Storage bucket names
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Optional Google OAuth
- `RESEND_API_KEY`: Email service for invitations

### TypeScript/JavaScript Mix
- Project uses both `.ts/.tsx` (widgets, APIs) and `.js/.jsx` (pages, components)
- Path alias `@/*` maps to `src/*` (configured in `tsconfig.json` and `jsconfig.json`)
- Strict mode enabled for TypeScript files

## Development Notes

### When Working with Real-Time Features
- Always broadcast updates via `broadcastToBoard()` after modifying board state
- The SSE endpoint at `/api/stream` must remain available for displays to function
- Connection cleanup is automatic but can be monitored via `getConnectionStats()`

### When Adding New Widgets
1. Create widget component in `src/components/widgets/`
2. Register in `WIDGET_CONFIGS` in `WidgetRegistry.tsx`
3. Add to `RenderWidget` switch statement
4. Implement both organize and display modes
5. Add widget-specific configuration in `PropertiesPanel.jsx` and `ContextPanel.jsx`

### When Modifying Database Schema
- Update both `supabase.js` service methods and RLS policies in Supabase
- Call appropriate cache invalidation functions from `src/lib/cache.js`
- Consider impact on real-time synchronization and broadcast logic

### Cache Invalidation Pattern
When updating boards:
```javascript
// Invalidate specific board cache
invalidateBoardCache(boardId)

// Invalidate user's board list cache
invalidateUserBoards(userId)
```

### Board Access Control
Check permissions using `boardService.checkUserPermission(boardId, userId)` before allowing modifications. Returns role: 'owner', 'editor', 'viewer', or null.
