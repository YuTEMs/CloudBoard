

This README provides a comprehensive overview of your Smart Bulletin Board system, explains how to use all the features, and gives users the information they need to get started quickly. It highlights the real-time capabilities, browser compatibility, and various use cases while maintaining a professional and user-friendly tone.

markdown:README.md
#  Smart Bulletin Board

A modern, real-time digital bulletin board system built with Next.js that allows users to create, edit, and display dynamic content with automatic updates across multiple displays.

##  Features

###  **Rich Content Support**
- **Images & Videos**: Upload and display high-quality media files
- **Text Widgets**: Customizable text with fonts, colors, and styling
- **Interactive Widgets**: 
  - **Time Widget**: Real-time clock and date display
  - **Weather Widget**: Current weather information display
  - **Slideshow Widget**: Auto-advancing image/video presentations
  - **Announcement Widget**: Scheduled announcements with time-based activation

###  **Real-Time Updates**
- **Instant Synchronization**: Changes appear immediately across all connected displays
- **Cross-Browser Compatible**: Works seamlessly on Chrome, Firefox, Safari, and Edge
- **Automatic Fallback**: Intelligent polling system ensures updates even if real-time connections fail

###  **Professional Display Mode**
- **Fullscreen Display**: Optimized for digital signage and public displays
- **Responsive Design**: Automatically scales content to fit any screen size
- **Background Customization**: Set custom backgrounds or solid colors

###  **Powerful Editor**
- **Drag & Drop Interface**: Intuitive content placement and resizing
- **Real-Time Preview**: See changes as you make them
- **Professional Tools**: Precise positioning, rotation, and layering controls

##  Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd smart-bulletin-board
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## �� How to Use

### 1. **Create Your First Board**
- Click "Create Board" from the dashboard
- Enter a name and description
- Your new board will appear in the dashboard

### 2. **Edit Your Board**
- Click "Edit" on any board
- Use the sidebar to add content:
  - **Upload Media**: Drag and drop images/videos
  - **Add Widgets**: Choose from time, weather, slideshow, or announcement widgets
  - **Customize Background**: Set colors or upload background images

### 3. **Arrange Content**
- **Drag & Drop**: Move items around the canvas
- **Resize**: Use corner handles to adjust item sizes
- **Layer**: Items automatically stack with proper z-index management
- **Rotate**: Apply rotations for creative layouts

### 4. **Configure Widgets**

#### **Time Widget**
- Automatically displays current time and date
- Updates every second in real-time

#### **Weather Widget**
- Shows temperature, conditions, and humidity
- Perfect for public information displays

#### **Slideshow Widget**
- Upload multiple images/videos
- Set custom duration for each slide
- Auto-advances with smooth transitions
- Maintains 16:9 aspect ratio automatically

#### **Announcement Widget**
- Schedule announcements for specific dates and times
- Set active periods (e.g., 9 AM - 5 PM)
- Perfect for time-sensitive information

### 5. **Display Your Board**
- Click "Copy URL" to get the display link
- Open the URL in any browser or device
- The board will display in fullscreen mode
- Updates from the editor appear automatically

## �� Browser Support

Google Chrome only

## ️ Architecture

### **Frontend**
- **Next.js 15**: Modern React framework with App Router
- **HeroUI**: Beautiful, accessible component library
- **Tailwind CSS**: Utility-first styling framework

### **Backend**
- **Supabase**: Real-time database with PostgreSQL
- **NextAuth.js**: Secure authentication system
- **Server-Sent Events**: Real-time communication protocol

### **Real-Time Features**
- **Webhook Integration**: Automatic updates via Supabase webhooks
- **SSE Fallback**: Intelligent polling when real-time connections fail
- **Cross-Device Sync**: Updates appear simultaneously on all displays

##  Configuration

### **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_MEDIA_BUCKET=media
NEXT_PUBLIC_USE_API_UPLOAD=true
NEXT_PUBLIC_USE_SIGNED_UPLOAD=true
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### **Supabase Setup**
1. Create a new Supabase project
2. Set up the required tables (`users`, `boards`)
3. Configure Row Level Security (RLS) policies
4. Set up webhook endpoints for real-time updates
5. Create a Storage bucket for media (e.g., `upload-media`)
   - Make the bucket public
   - Add policies to allow uploads for your usage (anon or authenticated)
   - Files are uploaded to paths like `userId/boardId/(images|videos)/...`
   - Max file size enforced client-side is 50MB
   - Optimized: Direct-to-Supabase signed uploads are enabled by default (`NEXT_PUBLIC_USE_SIGNED_UPLOAD=true`). This bypasses Vercel for the file bytes for faster uploads.
   - Fallbacks: If signed uploads fail, the server-side `/api/upload` route is used. As a last resort, direct browser uploads can be enabled with `NEXT_PUBLIC_USE_API_UPLOAD=false` (requires permissive Storage RLS; not recommended with NextAuth).

6. Vercel Regions (optional performance)
   - `vercel.json` sets API function regions (e.g., `sin1`, `syd1`). Adjust to be closest to your Supabase project region for lower latency.

## 📱 Use Cases

### **Digital Signage**
- Corporate lobbies and reception areas
- Retail stores and shopping centers
- Educational institutions and campuses
- Healthcare facilities and waiting rooms

### **Event Management**
- Conference displays and schedules
- Trade show information boards
- Wedding and party announcements
- Sports venue scoreboards

### **Business Operations**
- Employee communication boards
- Production line status displays
- Warehouse information systems
- Customer service announcements

##  Deployment

### **Vercel**
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Next.js project
3. Deploy with zero configuration needed
