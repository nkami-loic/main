import { Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";
import { AuthRequest } from "../types/auth.types.js";

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // je récupére le token du header Authorization
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        error: "Token manquant",
        message: "Vous devez être connecté pour accéder à cette ressource",
      });
      return;
    }

    const decoded = verifyToken(token);

    // Ajouter les infos utilisateur à la requête
    req.user = decoded;

    next();
  } catch (error) {
    res.status(403).json({
      error: "Token invalide",
      message: "Votre session a expiré ou le token est invalide",
    });
  }
};
