/**
 * Router para la gestión de apuestas
 * @module routes/bets
 */
import { Router } from 'express';
import {
    getBets,
    getBetById,
    createBet,
    updateBet,
    deleteBet,
    getBetsByBookMaker,
    getBetsByType,
    getBetStats
} from '../controllers/bets.controller.js';

const router = Router();

// Rutas CRUD
/**
 * Obtiene todas las apuestas
 * @route GET /api/bets
 */
router.get('/', getBets);

/**
 * Obtiene una apuesta específica por su ID
 * @route GET /api/bets/:id
 */
router.get('/:id', getBetById);

/**
 * Crea una nueva apuesta
 * @route POST /api/bets
 */
router.post('/', createBet);

/**
 * Actualiza una apuesta existente
 * @route PUT /api/bets/:id
 */
router.put('/:id', updateBet);

/**
 * Elimina una apuesta
 * @route DELETE /api/bets/:id
 */
router.delete('/:id', deleteBet);

// Rutas adicionales
router.get('/bookmaker/:idBookMaker', getBetsByBookMaker);
router.get('/type/:betType', getBetsByType);
router.get('/stats/summary', getBetStats);

// Obtener apuestas por estado
router.get('/status/:status', getBetsByStatus);  // pending/won/lost

// Obtener apuestas por período
router.get('/period/:startDate/:endDate', getBetsByPeriod);

// Obtener resumen diario/mensual
router.get('/summary/daily', getDailyBetsSummary);
router.get('/summary/monthly', getMonthlyBetsSummary);

// Obtener apuestas por tipo
router.get('/type/:betType', getBetsByType);  // back/lay/etc

export default router;