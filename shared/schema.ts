import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const songs = pgTable("songs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  discovered: boolean("discovered").notNull().default(false),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  uploadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;

// Transform song data for the frontend
export interface SongNode {
  id: string;
  title: string;
  filename: string;
  position: [number, number, number];
  discovered: boolean;
}

export function transformSongToNode(song: Song): SongNode {
  return {
    id: song.id,
    title: song.title,
    filename: song.filename,
    position: [song.positionX, song.positionY, song.positionZ],
    discovered: song.discovered,
  };
}

export function transformNodeToSong(node: SongNode): Omit<InsertSong, 'uploadedAt'> {
  return {
    id: node.id,
    title: node.title,
    filename: node.filename,
    positionX: node.position[0],
    positionY: node.position[1],
    positionZ: node.position[2],
    discovered: node.discovered,
  };
}
