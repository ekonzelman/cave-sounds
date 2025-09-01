import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { nanoid } from "nanoid";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${nanoid()}-${Date.now()}${ext}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only WAV and MP3 files are allowed.'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve audio files
  app.use('/api/audio', (req, res, next) => {
    const filename = req.path.substring(1); // Remove leading slash
    const filePath = path.join(uploadDir, filename);
    
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving audio file:', err);
        res.status(404).json({ error: 'Audio file not found' });
      }
    });
  });

  // Upload audio file
  app.post('/api/upload-audio', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const title = path.basename(req.file.originalname, path.extname(req.file.originalname));
      
      // Generate random position in the cave
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 15;
      const position: [number, number, number] = [
        Math.cos(angle) * radius,
        1 + Math.random() * 2,
        Math.sin(angle) * radius
      ];

      const songData = {
        id: nanoid(),
        title,
        filename: req.file.filename,
        position,
        discovered: false,
        uploadedAt: new Date().toISOString()
      };

      // Store song metadata
      await storage.createSong(songData);

      res.json(songData);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Get all songs
  app.get('/api/songs', async (req, res) => {
    try {
      const songs = await storage.getAllSongs();
      res.json(songs);
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ error: 'Failed to fetch songs' });
    }
  });

  // Delete song
  app.delete('/api/songs/:id', async (req, res) => {
    try {
      const songId = req.params.id;
      const song = await storage.getSong(songId);
      
      if (!song) {
        return res.status(404).json({ error: 'Song not found' });
      }

      // Delete the audio file
      const filePath = path.join(uploadDir, song.filename);
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete from database
      await storage.deleteSong(songId);

      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete song' });
    }
  });

  // Update song discovery status
  app.patch('/api/songs/:id/discover', async (req, res) => {
    try {
      const songId = req.params.id;
      await storage.updateSongDiscovery(songId, true);
      res.json({ success: true });
    } catch (error) {
      console.error('Discovery update error:', error);
      res.status(500).json({ error: 'Failed to update discovery status' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
