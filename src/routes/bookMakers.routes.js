/**
 * Router para la gestión de casas de apuestas
 * @module routes/bookMakers
 */
import { Router } from 'express';
import {
    getBookMakers,
    getBookMakerById,
    createBookMaker,
    updateBookMaker,
    deleteBookMaker
} from '../controllers/bookMakers.controller.js';

const router = Router();

/**
 * @swagger
 * /api/bookMakers:
 *   get:
 *     summary: Obtiene todas las casas de apuestas
 *     tags: [BookMakers]
 *     responses:
 *       200:
 *         description: Lista de casas de apuestas
 *       500:
 *         description: Error del servidor
 */
router.get('/', getBookMakers);

/**
 * @swagger
 * /api/bookMakers/{id}:
 *   get:
 *     summary: Obtiene una casa de apuestas por ID
 *     tags: [BookMakers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Casa de apuestas encontrada
 *       404:
 *         description: Casa de apuestas no encontrada
 */
router.get('/:id', getBookMakerById);

/**
 * @swagger
 * /api/bookMakers:
 *   post:
 *     summary: Crea una nueva casa de apuestas
 *     tags: [BookMakers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - comission
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [regular, exchange]
 *               comission:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               info:
 *                 type: string
 *     responses:
 *       201:
 *         description: Casa de apuestas creada
 *       400:
 *         description: Datos inválidos
 */
router.post('/', createBookMaker);

/**
 * @swagger
 * /api/bookMakers/{id}:
 *   put:
 *     summary: Actualiza una casa de apuestas
 *     tags: [BookMakers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [regular, exchange]
 *               comission:
 *                 type: number
 *               info:
 *                 type: string
 *     responses:
 *       200:
 *         description: Casa de apuestas actualizada
 *       404:
 *         description: Casa de apuestas no encontrada
 */
router.put('/:id', updateBookMaker);

/**
 * @swagger
 * /api/bookMakers/{id}:
 *   delete:
 *     summary: Elimina una casa de apuestas
 *     tags: [BookMakers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Casa de apuestas eliminada
 *       404:
 *         description: Casa de apuestas no encontrada
 *       409:
 *         description: No se puede eliminar por tener registros asociados
 */
router.delete('/:id', deleteBookMaker);


/**
 * Obtiene la actividad reciente de una casa de apuestas
 * @route GET /api/bookMakers/:id/activity
 */
router.get('/:id/activity', getBookMakerActivity);

/**
 * Obtiene análisis de rendimiento de una casa de apuestas
 * @route GET /api/bookMakers/:id/performance
 */
router.get('/:id/performance', getBookMakerPerformance);




export default router;