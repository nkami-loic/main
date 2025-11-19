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
  first_name: string;
  last_name: string;
  phone?: string;
  role: "player" | "organizer" | "admin";
  created_at: Date;
  updated_at: Date;
}

export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: "player" | "organizer";
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
    first_name: string;
    last_name: string;
    role: string;
  };
}
