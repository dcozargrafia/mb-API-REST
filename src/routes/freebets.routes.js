/**
 * Router para la gestión de freebets
 * @module routes/freebets
 */
import { Router } from 'express';
import {
    getFreebets,
    getFreebetById,
    createFreebet,
    updateFreebet,
    deleteFreebet,
    getFreebetsByBookMaker,
    getFreebetsByStatus,
    getFreebetStats
} from '../controllers/freebets.controller.js';

const router = Router();

// Rutas CRUD
/**
 * Obtiene todas las freebets
 * @route GET /api/freebets
 */
router.get('/', getFreebets);

/**
 * Obtiene una freebet específica por su ID
 * @route GET /api/freebets/:id
 */
router.get('/:id', getFreebetById);

/**
 * Crea una nueva freebet
 * @route POST /api/freebets
 */
router.post('/', createFreebet);

/**
 * Actualiza una freebet existente
 * @route PUT /api/freebets/:id
 */
router.put('/:id', updateFreebet);

/**
 * Elimina una freebet
 * @route DELETE /api/freebets/:id
 */
router.delete('/:id', deleteFreebet);

// Rutas adicionales
router.get('/bookmaker/:idBookMaker', getFreebetsByBookMaker);
router.get('/status/:status', getFreebetsByStatus);
router.get('/stats/summary', getFreebetStats);

// Rutas adicionales para análisis de freebets
router.get('/expiring', getExpiringFreebets);
router.get('/value/:minAmount', getFreebetsByValue);
router.get('/conversion-rate', getFreebetConversionRate);

export default router;