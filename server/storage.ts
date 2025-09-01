import { users, songs, type User, type InsertUser, type Song, type InsertSong, transformSongToNode, transformNodeToSong } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neon } from "@neondatabase/serverless";
import type { SongNode } from "@shared/schema";

// Database connection
const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection);

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private songsMap: Map<string, Song>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.songsMap = new Map();
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
      return result[0];
    } catch (error) {
      console.error('Error fetching song from database:', error);
      return this.songsMap.get(id);
    }
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
        uploadedAt: songData.uploadedAt
      };
      this.songsMap.set(song.id, memSong);
      return memSong;
    }
  }

  async deleteSong(id: string): Promise<void> {
    try {
      await db.delete(songs).where(eq(songs.id, id));
    } catch (error) {
      console.error('Error deleting song from database:', error);
      // Fallback to in-memory storage
      this.songsMap.delete(id);
    }
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
}

export const storage = new MemStorage();
