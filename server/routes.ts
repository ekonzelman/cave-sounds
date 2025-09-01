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

  // Update song customization
  app.put('/api/songs/:id/customization', async (req, res) => {
    try {
      const songId = req.params.id;
      const { nodeShape, nodeSize, nodeColor, glowIntensity, animationStyle } = req.body;
      
      await storage.updateSongCustomization(songId, {
        nodeShape,
        nodeSize,
        nodeColor,
        glowIntensity,
        animationStyle
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating song customization:', error);
      res.status(500).json({ error: 'Failed to update song customization' });
    }
  });

  // Cave objects endpoints
  app.get('/api/cave-objects', async (req, res) => {
    try {
      const caveObjects = await storage.getAllCaveObjects();
      res.json(caveObjects);
    } catch (error) {
      console.error('Error fetching cave objects:', error);
      res.status(500).json({ error: 'Failed to fetch cave objects' });
    }
  });

  app.post('/api/cave-objects', async (req, res) => {
    try {
      const { objectType, positionX, positionY, positionZ, scaleX, scaleY, scaleZ, color, opacity, rotationX, rotationY, rotationZ } = req.body;
      
      const caveObject = await storage.createCaveObject({
        id: nanoid(),
        objectType,
        positionX: positionX || 0,
        positionY: positionY || 0,
        positionZ: positionZ || 0,
        scaleX: scaleX || 1.0,
        scaleY: scaleY || 1.0,
        scaleZ: scaleZ || 1.0,
        color: color || '#ffffff',
        opacity: opacity || 0.8,
        isVisible: true,
        rotationX: rotationX || 0,
        rotationY: rotationY || 0,
        rotationZ: rotationZ || 0
      });
      
      res.json(caveObject);
    } catch (error) {
      console.error('Error creating cave object:', error);
      res.status(500).json({ error: 'Failed to create cave object' });
    }
  });

  app.put('/api/cave-objects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      await storage.updateCaveObject(id, updates);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating cave object:', error);
      res.status(500).json({ error: 'Failed to update cave object' });
    }
  });

  app.delete('/api/cave-objects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCaveObject(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting cave object:', error);
      res.status(500).json({ error: 'Failed to delete cave object' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
