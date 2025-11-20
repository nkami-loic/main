import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types.js";

// Middleware pour vérifier si l'utilisateur est un organisateur
export const isOrganizer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: "Non authentifié",
      message: "Vous devez être connecté",
    });
    return;
  }

  if (req.user.role !== "organizer" && req.user.role !== "admin") {
    res.status(403).json({
      error: "Accès refusé",
      message: "Vous devez être organisateur pour effectuer cette action",
    });
    return;
  }

  next();
};

// Middleware pour vérifier si l'utilisateur est un administrateur
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: "Non authentifié",
      message: "Vous devez être connecté",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      error: "Accès refusé",
      message: "Vous devez être administrateur pour effectuer cette action",
    });
    return;
  }

  next();
};
