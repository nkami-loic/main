import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types.js";

// Configuration JWT
const JWT_SECRET: string =
  process.env.JWT_SECRET || "votre_secret_super_securise_changez_moi";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/**
 * Génère un token JWT
 */
export const generateToken = (payload: JwtPayload): string => {
  // Cast explicite pour éviter les problèmes de typage
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as any);
};

/**
 * Vérifie et décode un token JWT
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expiré");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Token invalide");
    }
    throw new Error("Erreur de vérification du token");
  }
};

/**
 * Décode un token sans le vérifier (pour debug)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Extrait le token du header Authorization
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};
