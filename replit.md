# Overview

This is a 3D music exploration application built as a cave-like audio experience. Users navigate through a virtual cave environment where they can discover and interact with floating song nodes. Each discovered song provides immersive audio visualization effects while playing. The application includes an admin panel for uploading and managing audio files with 3D spatial positioning.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React 18 and Three.js for 3D rendering:
- **React Three Fiber**: Primary 3D rendering engine with Canvas component
- **Drei**: Helper library providing OrbitControls, KeyboardControls, and 3D primitives
- **UI Components**: Radix UI components with Tailwind CSS for styling
- **State Management**: Zustand stores for game state, audio management, and music exploration logic
- **TypeScript**: Full type safety across the codebase

## Backend Architecture
Express.js server with modular routing:
- **File Upload Handling**: Multer middleware for audio file uploads with validation
- **Static File Serving**: Audio files served from uploads directory
- **Development Setup**: Vite integration for hot module replacement
- **Error Handling**: Centralized error middleware with structured responses

## Data Storage Solutions
Dual storage approach for flexibility:
- **PostgreSQL**: Primary database using Drizzle ORM with Neon serverless
- **In-Memory Storage**: Fallback MemStorage class for development/testing
- **Schema Design**: Users table for authentication, songs table with 3D coordinates and discovery state
- **File Storage**: Audio files stored in local uploads directory

## Audio Processing System
Web Audio API integration for real-time analysis:
- **AudioManager**: Custom class handling audio loading and context management
- **SimpleAudioAnalyzer**: Frequency and waveform analysis for visualizations
- **Audio Store**: Zustand store managing playback state, muting, and sound effects
- **Visualization Filters**: Multiple visual effects (bars, wave, spiral, burst) synchronized with audio

## 3D Cave Environment
Three.js scene with procedural cave generation:
- **Cave Component**: Generates walls, tunnels, and ceiling geometry with stone textures
- **Song Nodes**: Floating 3D spheres positioned in cave space with discovery mechanics
- **Player Controller**: WASD movement with collision detection and interaction system
- **Camera System**: First-person perspective with smooth movement interpolation

## Game State Management
Zustand stores managing application flow:
- **Music Explorer Store**: Main game logic, song discovery, and spatial audio
- **Audio Store**: Sound effects, muting, and background music control
- **Game Store**: Phase transitions and restart functionality

## External Dependencies

### Database & ORM
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations with schema migrations
- **Connect-pg-simple**: PostgreSQL session store integration

### 3D Graphics & Audio
- **Three.js**: Core 3D rendering engine
- **React Three Fiber**: React bindings for Three.js
- **React Three Drei**: Common 3D component helpers
- **React Three Postprocessing**: Visual effects pipeline
- **Web Audio API**: Native browser audio processing

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide React**: Icon library
- **Class Variance Authority**: Type-safe styling variants

### File Handling & Utilities
- **Multer**: Multipart form handling for file uploads
- **Nanoid**: URL-safe unique ID generation
- **Date-fns**: Date manipulation utilities
- **Zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool with HMR support
- **ESBuild**: Fast bundling for production
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing with Autoprefixer