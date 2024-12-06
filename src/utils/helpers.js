// utils/helpers.js
/**
 * Helpers para operaciones con la base de datos MySQL
 * 
 * Proporciona funciones para las operaciones básicas de MySQL:
 * - dbGet: Para obtener un único registro
 * - dbAll: Para obtener múltiples registros
 * - dbRun: Para ejecutar comandos (INSERT, UPDATE, DELETE)
 */
import pool from '../config/database.js';

/**
 * Obtiene un único registro de la base de datos
 * 
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros para la consulta
 * @returns {Promise<Object>} Registro encontrado o undefined
 * @throws {Error} Si hay un error en la consulta
 * 
 * @example
 * const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
 */
const dbGet = async (sql, params = []) => {
    try {
        const [rows] = await pool.query(sql, params);
        return rows[0]; // Devuelve el primer registro o undefined
    } catch (error) {
        throw new Error(`Error en dbGet: ${error.message}`);
    }
};

/**
 * Obtiene múltiples registros de la base de datos
 * 
 * @param {string} sql - Consulta SQL
 * @param {Array} params - Parámetros para la consulta
 * @returns {Promise<Array>} Array de registros encontrados
 * @throws {Error} Si hay un error en la consulta
 * 
 * @example
 * const users = await dbAll('SELECT * FROM users WHERE active = ?', [true]);
 */
const dbAll = async (sql, params = []) => {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (error) {
        throw new Error(`Error en dbAll: ${error.message}`);
    }
};

/**
 * Ejecuta una operación en la base de datos
 * Útil para INSERT, UPDATE, DELETE
 * 
 * @param {string} sql - Comando SQL
 * @param {Array} params - Parámetros para el comando
 * @returns {Promise<Object>} Objeto con resultados de la operación
 * @throws {Error} Si hay un error en la operación
 * 
 * @example
 * const result = await dbRun('INSERT INTO users (name) VALUES (?)', ['John']);
 * console.log(result.insertId); // ID del nuevo registro
 */
const dbRun = async (sql, params = []) => {
    try {
        const [result] = await pool.query(sql, params);
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        throw new Error(`Error en dbRun: ${error.message}`);
    }
};

export {
    dbGet,
    dbAll,
    dbRun
};