import { users, songs, caveObjects, type User, type InsertUser, type Song, type InsertSong, type CaveObject, type InsertCaveObject, transformSongToNode, transformNodeToSong, transformCaveObjectToNode } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import type { SongNode, CaveObjectNode } from "@shared/schema";

// Database connection
const connectionString = process.env.DATABASE_URL!;
const sql = neon(connectionString);
const db = drizzle(sql);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Song methods
  getAllSongs(): Promise<SongNode[]>;
  getSong(id: string): Promise<Song | undefined>;
  createSong(song: Omit<InsertSong, 'uploadedAt'> & { uploadedAt?: string }): Promise<Song>;
  deleteSong(id: string): Promise<void>;
  updateSongDiscovery(id: string, discovered: boolean): Promise<void>;
  updateSongCustomization(id: string, customization: Partial<Pick<Song, 'nodeShape' | 'nodeSize' | 'nodeColor' | 'glowIntensity' | 'animationStyle'>>): Promise<void>;
  
  // Cave object methods
  getAllCaveObjects(): Promise<CaveObjectNode[]>;
  getCaveObject(id: string): Promise<CaveObject | undefined>;
  createCaveObject(obj: Omit<InsertCaveObject, 'createdAt'> & { createdAt?: string }): Promise<CaveObject>;
  updateCaveObject(id: string, updates: Partial<Omit<CaveObject, 'id' | 'createdAt'>>): Promise<void>;
  deleteCaveObject(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private songsMap: Map<string, Song>;
  private caveObjectsMap: Map<string, CaveObject>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.songsMap = new Map();
    this.caveObjectsMap = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllSongs(): Promise<SongNode[]> {
    try {
      const result = await db.select().from(songs);
      return result.map(transformSongToNode);
    } catch (error) {
      console.error('Error fetching songs from database:', error);
      // Fallback to in-memory storage
      return Array.from(this.songsMap.values()).map(transformSongToNode);
    }
  }

  async getSong(id: string): Promise<Song | undefined> {
    try {
      const result = await db.select().from(songs).where(eq(songs.id, id));
      if (result[0]) {
        console.log(`Found song ${id} in database: ${result[0].title}`);
        return result[0];
      }
    } catch (error) {
      console.log(`Database getSong failed for ${id}, checking in-memory:`, error.message);
    }
    
    // Check in-memory storage
    const memSong = this.songsMap.get(id);
    if (memSong) {
      console.log(`Found song ${id} in memory: ${memSong.title}`);
      return memSong;
    }
    
    console.log(`Song ${id} not found in database or memory`);
    return undefined;
  }

  async createSong(song: Omit<InsertSong, 'uploadedAt'> & { uploadedAt?: string }): Promise<Song> {
    const songData = {
      ...song,
      uploadedAt: song.uploadedAt ? new Date(song.uploadedAt) : new Date()
    };
    
    try {
      const result = await db.insert(songs).values(songData).returning();
      return result[0];
    } catch (error) {
      console.error('Error inserting song into database:', error);
      // Fallback to in-memory storage
      const memSong: Song = {
        ...songData,
        discovered: songData.discovered ?? false,
        uploadedAt: songData.uploadedAt
      };
      this.songsMap.set(song.id, memSong);
      return memSong;
    }
  }

  async deleteSong(id: string): Promise<void> {
    console.log(`Storage: Attempting to delete song ${id}`);
    
    try {
      const result = await db.delete(songs).where(eq(songs.id, id));
      console.log(`Database deletion result:`, result);
    } catch (error) {
      console.log(`Database deletion failed, using in-memory fallback:`, error.message);
    }
    
    // Always try to delete from in-memory storage as well (covers both scenarios)
    const wasInMemory = this.songsMap.has(id);
    this.songsMap.delete(id);
    console.log(`In-memory deletion: ${wasInMemory ? 'found and deleted' : 'not found'}`);
  }

  async updateSongDiscovery(id: string, discovered: boolean): Promise<void> {
    try {
      await db.update(songs).set({ discovered }).where(eq(songs.id, id));
    } catch (error) {
      console.error('Error updating song discovery in database:', error);
      // Fallback to in-memory storage
      const song = this.songsMap.get(id);
      if (song) {
        this.songsMap.set(id, { ...song, discovered });
      }
    }
  }

  async updateSongCustomization(id: string, customization: Partial<Pick<Song, 'nodeShape' | 'nodeSize' | 'nodeColor' | 'glowIntensity' | 'animationStyle'>>): Promise<void> {
    try {
      await db.update(songs).set(customization).where(eq(songs.id, id));
    } catch (error) {
      console.error('Error updating song customization in database:', error);
      // Fallback to in-memory storage
      const song = this.songsMap.get(id);
      if (song) {
        this.songsMap.set(id, { ...song, ...customization });
      }
    }
  }

  // Cave object methods
  async getAllCaveObjects(): Promise<CaveObjectNode[]> {
    try {
      const result = await db.select().from(caveObjects);
      console.log('Database cave objects result:', result);
      return result.map(transformCaveObjectToNode);
    } catch (error) {
      console.error('Error fetching cave objects from database:', error);
      // Fallback to in-memory storage
      console.log('Using in-memory cave objects:', this.caveObjectsMap.size);
      return Array.from(this.caveObjectsMap.values()).map(transformCaveObjectToNode);
    }
  }

  async getCaveObject(id: string): Promise<CaveObject | undefined> {
    try {
      const result = await db.select().from(caveObjects).where(eq(caveObjects.id, id));
      return result[0];
    } catch (error) {
      console.error('Error fetching cave object from database:', error);
      return this.caveObjectsMap.get(id);
    }
  }

  async createCaveObject(obj: Omit<InsertCaveObject, 'createdAt'> & { createdAt?: string }): Promise<CaveObject> {
    const objectData: CaveObject = {
      ...obj,
      createdAt: obj.createdAt ? new Date(obj.createdAt) : new Date(),
      scaleX: obj.scaleX ?? 1.0,
      scaleY: obj.scaleY ?? 1.0,
      scaleZ: obj.scaleZ ?? 1.0,
      color: obj.color ?? '#ffffff',
      opacity: obj.opacity ?? 0.8,
      rotationX: obj.rotationX ?? 0,
      rotationY: obj.rotationY ?? 0,
      rotationZ: obj.rotationZ ?? 0,
      isVisible: obj.isVisible ?? true
    };
    
    // Always save to in-memory first for immediate availability
    this.caveObjectsMap.set(obj.id, objectData);
    console.log('Created cave object in memory:', obj.id, 'Total objects:', this.caveObjectsMap.size);
    
    try {
      const result = await db.insert(caveObjects).values(objectData).returning();
      return result[0];
    } catch (error) {
      console.error('Error inserting cave object into database:', error);
      // Object is already in memory, so return it
      return objectData;
    }
  }

  async updateCaveObject(id: string, updates: Partial<Omit<CaveObject, 'id' | 'createdAt'>>): Promise<void> {
    try {
      await db.update(caveObjects).set(updates).where(eq(caveObjects.id, id));
    } catch (error) {
      console.error('Error updating cave object in database:', error);
      // Fallback to in-memory storage
      const obj = this.caveObjectsMap.get(id);
      if (obj) {
        this.caveObjectsMap.set(id, { ...obj, ...updates });
      }
    }
  }

  async deleteCaveObject(id: string): Promise<void> {
    try {
      await db.delete(caveObjects).where(eq(caveObjects.id, id));
    } catch (error) {
      console.error('Error deleting cave object from database:', error);
      // Fallback to in-memory storage
      this.caveObjectsMap.delete(id);
    }
  }
}

export const storage = new MemStorage();
