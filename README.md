# Smart Bulletin Board

A real-time digital bulletin board system for creating and displaying dynamic content across multiple displays. Built with Next.js and Supabase

## Features

- Upload images and videos up to 50MB
- Interactive widgets: time, weather, slideshow, and announcements
- Real-time synchronization across all connected displays
- Drag and drop canvas editor with resize and positioning tools
- Fullscreen display mode optimized for digital signage
- User authentication with Google OAuth and email/password
- Secure file storage with automatic cleanup

## Getting Started

### Prerequisites
- Node.js 18+
- npm package manager
- Chrome browser (recommended)
- Supabase account for database and storage

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/yourusername/smart-bulletin-board-final-year-project.git
   cd smart-bulletin-board-final-year-project
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET=upload-media
   # Optional Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. Set up Supabase database and storage bucket

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in Chrome browser

## How to Use

1. Create an account and access the dashboard
2. Create a new board with a name and description
3. Use organize mode to add widgets and content with drag-and-drop
4. Configure widgets (time, weather, slideshow, announcements)
5. Save changes to sync across all displays
6. Use display mode for fullscreen presentation

## Technology Stack

- Next.js 15 with React 19
- HeroUI and Tailwind CSS for styling
- Supabase for database and real-time updates
- NextAuth.js for authentication
- Server-sent events for real-time synchronization
- Open-Meteo API for weather data

## Project Structure

```
src/
├── app/                    # Next.js pages and API routes
├── components/             # React components
│   └── widgets/           # Widget system (time, weather, slideshow, announcements)
├── hooks/                 # Custom hooks for real-time updates
└── lib/                   # Utilities (Supabase, storage, weather API)
```

## Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

