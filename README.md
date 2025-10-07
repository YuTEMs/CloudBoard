# CloudBoard

A real-time digital bulletin board system for creating and managing dynamic content across multiple displays. Perfect for digital signage, information displays, and collaborative boards.

## What is CloudBoard?

CloudBoard lets you create interactive digital boards with widgets, media content, and advertisements that sync in real-time across all connected displays. Built with Next.js and Supabase for seamless performance and real-time updates.

**Key Features:**
- Drag-and-drop canvas editor for easy content arrangement
- Real-time synchronization across multiple displays
- Interactive widgets (time, weather, slideshows)
- Advertisement management with scheduling and analytics
- Multi-user collaboration with role-based access control
- AI-powered person detection for targeted ad display
- Secure authentication with Google OAuth and email/password

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Chrome browser (recommended)

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd CloudBoard
   npm install
   ```

2. **Configure environment variables:**

   Create a `.env.local` file with:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<your-secret>
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
   NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET=upload-media
   NEXT_PUBLIC_SUPABASE_ADVERTISEMENT_BUCKET=advertisement-media
   ```

3. **Set up database:**

   Run the schema in `schema.sql` on your Supabase project

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Open http://localhost:3000** and create an account

## Usage

1. **Dashboard** - Create and manage your boards
2. **Organize Mode** - Add widgets, media, and configure layouts
3. **Display Mode** - Fullscreen view for digital signage
4. **Manage Ads** - Upload and schedule advertisements with analytics

## Tech Stack

- Next.js 15 with React 19
- Supabase (PostgreSQL + Realtime + Storage)
- Server-Sent Events (SSE) for real-time sync
- NextAuth.js for authentication
- TensorFlow.js for person detection
- Tailwind CSS + HeroUI

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production build
npm run lint     # Run ESLint
```

---

Built with ❤️ for digital signage and collaborative displays
