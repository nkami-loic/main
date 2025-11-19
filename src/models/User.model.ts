import { pool } from "../../config/db.js";
import { User, RegisterDto } from "../types/auth.types.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export class UserModel {
  /**
   * Trouve un utilisateur par email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) return null;
    return rows[0] as User;
  }

  /**
   * Trouve un utilisateur par ID
   */
  static async findById(id: number): Promise<User | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) return null;
    return rows[0] as User;
  }

  /**
   * Crée un nouvel utilisateur
   */
  static async create(
    userData: RegisterDto & { password: string }
  ): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password, first_name, last_name, phone, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userData.email,
        userData.password,
        userData.first_name,
        userData.last_name,
        userData.phone || null,
        userData.role || "player",
      ]
    );

    return result.insertId;
  }

  /**
   * Vérifie si un email existe déjà
   */
  static async emailExists(email: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users WHERE email = ?",
      [email]
    );

    return rows[0].count > 0;
  }
}
