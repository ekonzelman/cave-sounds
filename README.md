# Cave Sounds - 3D Music Exploration

A WebGL 3D music exploration web application where users navigate through an underground cave environment, discover songs as interactive nodes, and experience dramatic canvas-wide music visualizations with point cloud aesthetic and fluorescent accents.

## Features

### 🎵 Immersive Music Experience
- Navigate through a procedurally generated 3D cave environment
- Discover floating song nodes positioned throughout the cave space
- Real-time audio visualization with frequency analysis
- Multiple visualization modes: Frequency Bars, Wave Motion, Spiral Dance, Energy Burst
- Spatial audio positioning and smooth transitions

### 🎮 Interactive Controls
- WASD movement with collision detection
- First-person perspective with smooth camera interpolation
- Click to interact with song nodes
- Mute/unmute toggle for audio control
- Dynamic visualization filter switching

### 🛠️ Admin Panel
- Upload custom audio files with 3D spatial positioning
- Customize song node appearance (shape, size, color, glow intensity)
- Database storage for persistent song management
- Real-time song discovery state management

### 🎨 Visual Effects
- Point cloud aesthetic with black background
- Fluorescent accent colors (cyan, magenta, yellow)
- Particle systems synchronized with audio
- Smooth fade-in transitions for discoveries
- Multiple lighting setups for cave atmosphere

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Three.js** - 3D graphics rendering
- **React Three Fiber** - React bindings for Three.js
- **React Three Drei** - Helper components (OrbitControls, KeyboardControls)
- **TypeScript** - Type safety across the codebase
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web server framework
- **Multer** - File upload handling
- **TypeScript** - Server-side type safety

### Database & Storage
- **PostgreSQL** - Primary database with Neon serverless hosting
- **Drizzle ORM** - Type-safe database operations
- **In-Memory Fallback** - Development/testing storage solution
- **Local File Storage** - Audio files served from uploads directory

### State Management
- **Zustand** - Lightweight state management
- **Web Audio API** - Real-time audio analysis and processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or use provided Neon integration)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ekonzelman/cave-sounds.git
cd cave-sounds
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database connection (if using external PostgreSQL)
DATABASE_URL=your_postgresql_connection_string

# Additional database variables (auto-configured in Replit)
PGHOST=your_db_host
PGDATABASE=your_db_name
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGPORT=your_db_port
```

4. Push database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Usage

### Basic Navigation
- Use **WASD** keys to move through the cave
- **Mouse** to look around
- **Click** on glowing song nodes to discover and play music

### Music Controls
- **Click visualization buttons** to switch between animation modes
- **Mute button** to toggle audio on/off
- **Stop button** to end current song playback

### Admin Features
- Access admin panel to upload new audio files
- Position songs in 3D space using coordinate inputs
- Customize visual appearance of song nodes
- View real-time discovery statistics

## Project Structure

```
cave-sounds/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Cave.tsx    # 3D cave environment
│   │   │   ├── Player.tsx  # First-person controller
│   │   │   ├── AudioVisualizer.tsx  # Music visualizations
│   │   │   ├── GameUI.tsx  # User interface overlay
│   │   │   └── AdminPanel.tsx  # Admin management interface
│   │   ├── lib/
│   │   │   └── stores/     # Zustand state management
│   │   └── App.tsx         # Main application component
├── server/                 # Backend Express server
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   └── storage.ts         # Database abstractions
├── shared/                # Shared type definitions
│   └── schema.ts          # Database schema with Drizzle
└── uploads/               # Audio file storage
```

## Database Schema

### Songs Table
- `id` - Unique identifier
- `title` - Song display name  
- `filename` - Audio file reference
- `positionX/Y/Z` - 3D coordinates in cave space
- `discovered` - User discovery state
- `customization` - Visual appearance settings

### Users Table (Future)
- User authentication and profile management
- Personal discovery tracking
- Custom cave configurations

## Audio Processing

The application uses the Web Audio API for real-time frequency analysis:

- **AudioManager**: Handles audio loading and context management
- **SimpleAudioAnalyzer**: Provides frequency and waveform data
- **Visualization Filters**: Multiple visual effects synchronized with audio:
  - `bars`: Classic orbital frequency bars
  - `wave`: Undulating wave motion patterns  
  - `spiral`: Expanding spiral animations
  - `burst`: Explosive energy burst effects

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Push database schema changes
npm run db:push

# Force database schema push (data loss warning)
npm run db:push --force

# Generate database migrations
npm run db:generate

# View database in web interface
npm run db:studio
```

### Adding New Features

1. **Audio Visualizations**: Extend `AudioVisualizer.tsx` switch statement
2. **Cave Geometry**: Modify `Cave.tsx` procedural generation
3. **Song Interactions**: Update `useMusicExplorer.tsx` state management
4. **Admin Features**: Enhance `AdminPanel.tsx` management interface

## Deployment

The application is optimized for deployment on Replit with automatic:
- **Build Process**: Vite bundling with optimizations
- **Asset Serving**: Static file handling for audio uploads
- **Database Migrations**: Automatic schema synchronization
- **Environment Management**: Secure secrets handling

For external deployment, ensure:
1. PostgreSQL database is accessible
2. File upload directory has write permissions  
3. Environment variables are properly configured
4. Audio files are served with correct MIME types

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with ❤️ using React Three Fiber and Web Audio API
- Cave generation inspired by procedural geometry techniques
- Audio visualization concepts adapted from frequency domain analysis
- UI components powered by Radix UI accessibility primitives