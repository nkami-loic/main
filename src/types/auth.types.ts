import { Request } from "express";

export enum UserRole {
  PLAYER = "player",
  ORGANIZER = "organizer",
  ADMIN = "admin",
  USER = "user",
}

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: "player" | "organizer" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  tel: string;
  name: string;
  role?: "Player" | "Organizer";
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    role: "player" | "organizer" | "admin";
  };
}
export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}
