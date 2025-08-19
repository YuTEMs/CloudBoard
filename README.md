This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Smart Bulletin Board

A modern web application for creating and managing digital bulletin boards with slideshow capabilities, built with Next.js and React.

## Features

- 📋 **Dashboard**: Create and manage multiple bulletin boards
- 🎨 **Visual Editor**: Drag-and-drop interface for arranging content
- 🖼️ **Media Support**: Upload and display images and videos
- 📺 **Slideshow Widget**: Create slideshows with custom timing and reordering
- ⏰ **Time Widget**: Live clock display
- 🌤️ **Weather Widget**: Weather information display
- 🔄 **Real-time Updates**: Changes reflect immediately on display
- 📱 **Responsive**: Works on all device sizes
- 🌐 **Public Display**: Share boards via unique URLs

## Project Structure

```
smart-bulletin-board/
├── src/
│   ├── app/
│   │   ├── dashboard/     # Board management
│   │   ├── organize/      # Board editor
│   │   ├── display/       # Public display view
│   │   ├── login/         # Login page
│   │   ├── signup/        # Signup page
│   │   └── layout.js      # App layout
│   ├── components/        # Reusable components
│   └── lib/
│       └── utils.js       # Utility functions
├── public/                # Static assets
├── package.json
├── next.config.ts
└── vercel.json           # Vercel deployment config
```

## Getting Started

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Deployment

This project is optimized for deployment on Vercel:

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Next.js project
3. Deploy with zero configuration needed

The app uses localStorage for data persistence, so no database setup is required.

## Usage

### Getting Started
1. Visit the application homepage (redirects to login)
2. Click "Login" to access the dashboard (no authentication required)
3. Or click "Signup" to create a mock account (redirects to dashboard)

### Creating a Board
1. From the dashboard, click "Create Board"
2. Enter a name and description
3. Click "Create Board"

### Editing a Board
1. Click "Edit" on any board from the dashboard
2. Upload images/videos using the sidebar
3. Add widgets (Time, Weather, Slideshow)
4. Drag and resize items on the canvas
5. Click "Save Board" to persist changes

### Slideshow Features
- Drag files directly into slideshow widgets
- Use the dedicated upload areas in slideshow settings
- Reorder slides with up/down arrows
- Set custom duration for each slide
- 16:9 aspect ratio maintained automatically

### Displaying a Board
1. Click "Copy URL" from the dashboard
2. Open the URL in a new window/device
3. The board will display in fullscreen mode
4. Updates from the editor appear in real-time

## Tech Stack

- **Framework**: Next.js 15
- **UI Library**: HeroUI (NextUI successor)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: localStorage (client-side)
- **Deployment**: Vercel

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private. All rights reserved.
