import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types.js";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "votre_secret_super_securise_changez_moi";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload as any, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as any);
};

//verifie et decode un token JWT
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

//decode un token JWT
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload;
  } catch {
    return null;
  }
};

//extrait le token d'un header Bearer
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};
