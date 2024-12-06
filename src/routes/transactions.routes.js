/**
 * Router para la gestión de transacciones
 * @module routes/transactions
 */
import { Router } from 'express';
import {
    getTransactions,
    getTransactionById,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    // Operaciones adicionales
    getTransactionsByBookMaker,
    getTransactionsByType,
    getTransactionsByDateRange,
    getTransactionStats
} from '../controllers/transactions.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', getTransactions);
router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

// Rutas adicionales
router.get('/bookmaker/:idBookMaker', getTransactionsByBookMaker);
router.get('/type/:type', getTransactionsByType);
router.get('/range/:startDate/:endDate', getTransactionsByDateRange);
router.get('/stats/summary', getTransactionStats);

// Rutas adicionales para análisis financiero
router.get('/balance/:startDate/:endDate', getBalanceByPeriod);
router.get('/cashflow/monthly', getMonthlyCashflow);
router.get('/summary/deposits', getDepositsSummary);
router.get('/summary/withdrawals', getWithdrawalsSummary);

export default router;