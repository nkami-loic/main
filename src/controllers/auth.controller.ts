import { Request, Response } from "express";
// @ts-ignore
import bcrypt from "bcrypt";
import { pool } from "../../config/db.js";
import { generateToken } from "../utils/jwt.util.js";
import { UserRole } from "../types/auth.types.js";

/**
 * Inscription d'un nouvel utilisateur
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } =
      req.body;

    // Validation basique
    if (name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Tous les champs sont requis",
      });
      return;
    }

    // Vérifier si l'email existe déjà
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        message: "Cet email est déjà utilisé",
      });
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer la date de création
    const created_at = new Date();
    // Insérer l'utilisateur
    const [result] = await pool.query(
      "INSERT INTO users (name, email, phone , password, role, created_at) VALUES ( ?, ?, ?, ? ,?)",
      [name, email, hashedPassword, role, created_at]
    );

    const userId = (result as any).insertId;

    // Générer le token JWT
    const token = generateToken({
      userId,
      email,
      role,
    });

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      data: {
        token,
        user: {
          id: userId,
          name,
          email,
          role,
        },
      },
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription",
    });
  }
};

/**
 * Connexion d'un utilisateur
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
      return;
    }

    // Récupérer l'utilisateur
    const [users] = await pool.query(
      "SELECT id, name,  email, password, role FROM users WHERE email = ?",
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
      return;
    }

    const user = users[0] as any;

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
      return;
    }

    // Générer le token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: "Connexion réussie",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Erreur connexion:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la connexion",
    });
  }
};

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("🔍 req.user:", (req as any).user);
    const userId = (req as any).user?.userId;
    console.log("🔍 userId extrait:", userId);

    const [users] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Erreur récupération profil:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du profil",
    });
  }
};
