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
  
  // Song node appearance customization
  nodeShape: text("node_shape").default("sphere"), // sphere, cube, cylinder, dodecahedron
  nodeSize: real("node_size").default(1.0),
  nodeColor: text("node_color").default("#ff00ff"), // hex color
  glowIntensity: real("glow_intensity").default(1.0),
  animationStyle: text("animation_style").default("pulse"), // pulse, rotate, float, spiral
});

// New table for cave objects customization
export const caveObjects = pgTable("cave_objects", {
  id: text("id").primaryKey(),
  objectType: text("object_type").notNull(), // stalactite, stalagmite, crystal, particle_system
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  scaleX: real("scale_x").default(1.0),
  scaleY: real("scale_y").default(1.0),
  scaleZ: real("scale_z").default(1.0),
  color: text("color").default("#ffffff"),
  opacity: real("opacity").default(0.8),
  isVisible: boolean("is_visible").default(true),
  rotationX: real("rotation_x").default(0.0),
  rotationY: real("rotation_y").default(0.0),
  rotationZ: real("rotation_z").default(0.0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSongSchema = createInsertSchema(songs).omit({
  uploadedAt: true,
});

export const insertCaveObjectSchema = createInsertSchema(caveObjects).omit({
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type CaveObject = typeof caveObjects.$inferSelect;
export type InsertCaveObject = z.infer<typeof insertCaveObjectSchema>;

// Transform song data for the frontend
export interface SongNode {
  id: string;
  title: string;
  filename: string;
  position: [number, number, number];
  discovered: boolean;
  nodeShape?: string;
  nodeSize?: number;
  nodeColor?: string;
  glowIntensity?: number;
  animationStyle?: string;
}

// Transform cave object data for the frontend
export interface CaveObjectNode {
  id: string;
  objectType: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
  opacity: number;
  isVisible: boolean;
}

export function transformSongToNode(song: Song): SongNode {
  return {
    id: song.id,
    title: song.title,
    filename: song.filename,
    position: [song.positionX, song.positionY, song.positionZ],
    discovered: song.discovered,
    nodeShape: song.nodeShape || "sphere",
    nodeSize: song.nodeSize || 1.0,
    nodeColor: song.nodeColor || "#ff00ff",
    glowIntensity: song.glowIntensity || 1.0,
    animationStyle: song.animationStyle || "pulse",
  };
}

export function transformCaveObjectToNode(obj: CaveObject): CaveObjectNode {
  return {
    id: obj.id,
    objectType: obj.objectType,
    position: [obj.positionX, obj.positionY, obj.positionZ],
    scale: [obj.scaleX || 1.0, obj.scaleY || 1.0, obj.scaleZ || 1.0],
    rotation: [obj.rotationX || 0.0, obj.rotationY || 0.0, obj.rotationZ || 0.0],
    color: obj.color || "#ffffff",
    opacity: obj.opacity || 0.8,
    isVisible: obj.isVisible !== false,
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
