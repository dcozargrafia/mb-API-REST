/**
* Controlador para la gestión de transacciones
*
* Índice de funciones:
*
* Operaciones CRUD:
* - getTransactions()
* Obtiene todas las transacciones
* Query: {
*   page: number (default: 1),
*   limit: number (default: 10),
*   startDate: string (YYYY-MM-DD),
*   endDate: string (YYYY-MM-DD),
*   type: string ('deposit'|'withdrawal')
* }
*
* - createTransaction()
* Crea una nueva transacción
* Body: {
*   idBookMaker: number,
*   type: string ('deposit'|'withdrawal'),
*   amount: number,
*   date: string (YYYY-MM-DD),
*   info: string
* }
*
* - updateTransaction( id )
* Actualiza una transacción existente
* Params: id - ID de la transacción
* Body: campos a actualizar (todos opcionales)
*
* - deleteTransaction( id )
* Elimina una transacción
* Params: id - ID de la transacción
*
* Operaciones adicionales:
* - getTransactionsByBookMaker( idBookMaker )
* Obtiene transacciones de una casa de apuestas específica
* Params: idBookMaker - ID de la casa de apuestas
*
* - getTransactionStats()
* Obtiene estadísticas generales de transacciones
* Returns: {
*   bookMakerName: string,
*   totalTransactions: number,
*   totalDeposits: number,
*   totalWithdrawals: number,
*   firstTransaction: string (YYYY-MM-DD),
*   lastTransaction: string (YYYY-MM-DD)
* }
*/


import { dbAll, dbGet, dbRun } from '../utils/helpers.js'



/**
 * getTransactions
 * 
 * Obtiene todas las transacciones con soporte para filtrado y paginación
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de resultados por página
 * @param {string} [req.query.startDate] - Fecha inicial para filtrar (YYYY-MM-DD)
 * @param {string} [req.query.endDate] - Fecha final para filtrar (YYYY-MM-DD)
 * @param {string} [req.query.type] - Tipo de transacción (deposit/withdrawal)
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de transacciones
 *
 * @example
 * GET /api/transactions?page=1&limit=10&startDate=2024-01-01&endDate=2024-12-31&type=deposit
 */
const getTransactions = async ( req, res ) => {
    try {
        const { page = 1, limit = 10, startDate, endDate, type } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT t.*, b.name as bookMakerName FROM transactions t JOIN bookMakers b ON t.idBookMaker = b.id WHERE 1=1';
        const params = [];

        if ( startDate ) {
            sql += ' AND date >= ?';
            params.push( startDate );
        }

        if ( endDate ) {
            sql += ' AND date <= ?';
            params.push( endDate );
        }

        if ( type ) {
            sql += ' AND type = ?';
            params.push( type );
        }

        sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push(parseInt( limit ), parseInt( offset ));

        const transactions = await dbAll(sql, params);

        if ( !transactions.length ) {
            return res.status(204).send();
        }

        res.status(200).json( transactions );
    } catch (error) {
        console.error('Error al obtener transacciones:', error);
        res.status(500).json( {
            message: 'Error al obtener las transacciones',
            error: error.message
        } );
    }
};

/**
 * getTransactionsByBookMaker
 * 
 * Obtiene todas las transacciones de una casa de apuestas específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.idBookMaker - ID de la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de transacciones de la casa de apuestas
 *
 * @example
 * GET /api/transactions/bookmaker/1
 */
const getTransactionsByBookMaker = async ( req, res ) => {
    try {
        const { idBookMaker } = req.params;
        const sql = `
            SELECT t.*, b.name as bookMakerName 
            FROM transactions t 
            JOIN bookMakers b ON t.idBookMaker = b.id 
            WHERE t.idBookMaker = ?
            ORDER BY t.date DESC`;
        
        const transactions = await dbAll(
            sql, 
            [ idBookMaker ]
        );
        
        if ( !transactions.length ) {
            return res.status(204).send();
        }

        res.status(200).json( transactions );
    } 
    catch (error) {
        console.error('Error al obtener transacciones por casa de apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener las transacciones',
            error: error.message
        } );
    }
};

/**
 * getTransactionStats
 * 
 * Obtiene estadísticas generales de transacciones por casa de apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Estadísticas de transacciones agrupadas por casa de apuestas
 * @returns {string} returns.bookMakerName - Nombre de la casa de apuestas
 * @returns {number} returns.totalTransactions - Total de transacciones
 * @returns {number} returns.totalDeposits - Suma total de depósitos
 * @returns {number} returns.totalWithdrawals - Suma total de retiros
 * @returns {string} returns.firstTransaction - Fecha de la primera transacción
 * @returns {string} returns.lastTransaction - Fecha de la última transacción
 *
 * @example
 * GET /api/transactions/stats
 */
const getTransactionStats = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                b.name as bookMakerName,
                COUNT(*) as totalTransactions,
                SUM(CASE WHEN t.type = 'deposit' THEN amount ELSE 0 END) as totalDeposits,
                SUM(CASE WHEN t.type = 'withdrawal' THEN amount ELSE 0 END) as totalWithdrawals,
                MIN(t.date) as firstTransaction,
                MAX(t.date) as lastTransaction
            FROM transactions t
            JOIN bookMakers b ON t.idBookMaker = b.id
            GROUP BY b.id, b.name`;

        const stats = await dbAll( sql );
        res.status(200).json( stats );
    } 
    catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json( {
            message: 'Error al obtener las estadísticas',
            error: error.message
        } );
    }
};

/**
 * createTransaction
 * 
 * Crea una nueva transacción
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.body - Datos de la transacción
 * @param {number} req.body.idBookMaker - ID de la casa de apuestas
 * @param {string} req.body.type - Tipo de transacción (deposit/withdrawal)
 * @param {number} req.body.amount - Monto de la transacción
 * @param {string} req.body.date - Fecha de la transacción (YYYY-MM-DD)
 * @param {string} [req.body.info] - Información adicional
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la transacción creada
 *
 * @example
 * POST /api/transactions
 * Body: {
 *   "idBookMaker": 1,
 *   "type": "deposit",
 *   "amount": 100.50,
 *   "date": "2024-03-15",
 *   "info": "Depósito inicial"
 * }
 *
 * Restricciones:
 * - Los campos idBookMaker, type, amount y date son obligatorios
 * - El type debe ser "deposit" o "withdrawal"
 * - La casa de apuestas debe existir en la base de datos
 */
const createTransaction = async ( req, res ) => {
    try {
        const { idBookMaker, type, amount, date, info } = req.body;

        // Validaciones
        if ( !idBookMaker || !type || !amount || !date ) {
            return res.status(400).json( {
                message: 'Los campos idBookMaker, type, amount y date son obligatorios'
            } );
        }

        // Validar tipo
        if ( !['deposit', 'withdrawal'].includes( type ) ) {
            return res.status(400).json( {
                message: 'El tipo debe ser "deposit" o "withdrawal"'
            } );
        }

        // Validar casa de apuestas existe
        const bookMaker = await dbGet(
            'SELECT id FROM bookMakers WHERE id = ?', 
            [ idBookMaker ] );
        if ( !bookMaker ) {
            return res.status(404).json( {
                message: 'La casa de apuestas especificada no existe'
            } );
        }

        const sql = `
            INSERT INTO transactions (idBookMaker, type, amount, date, info)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = await dbRun(
            sql, 
            [ idBookMaker, type, amount, date, info ] 
        );

        res.status(201).json( {
            message: 'Transacción creada con éxito',
            data: {
                id: result.insertId,
                idBookMaker,
                type,
                amount,
                date,
                info
            }
        } );
    } 
    catch (error) {
        console.error('Error al crear transacción:', error);
        res.status(500).json( {
            message: 'Error al crear la transacción',
            error: error.message
        } );
    }
};


/**
* updateTransaction
* 
* Actualiza una transacción existente
*
* @param {Object} req - Objeto de solicitud HTTP
* @param {Object} req.params - Parámetros de la solicitud
* @param {number} req.params.id - ID de la transacción a actualizar
* @param {Object} req.body - Datos a actualizar
* @param {number} [req.body.idBookMaker] - ID de la casa de apuestas
* @param {string} [req.body.type] - Tipo de transacción (deposit/withdrawal)
* @param {number} [req.body.amount] - Monto de la transacción
* @param {string} [req.body.date] - Fecha de la transacción (YYYY-MM-DD) 
* @param {string} [req.body.info] - Información adicional
* @param {Object} res - Objeto de respuesta HTTP
* @throws {Error} Si ocurre un error interno en el servidor
* @returns {Object} Datos de la transacción actualizada
*
* @example
* PUT /api/transactions/1
* Body: {
*   "amount": 150.75,
*   "info": "Depósito corregido"
* }
*
* Restricciones:
* - La transacción debe existir
* - Si se especifica type, debe ser "deposit" o "withdrawal"
* - Si se especifica idBookMaker, la casa de apuestas debe existir
*/
const updateTransaction = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { idBookMaker, type, amount, date, info } = req.body;
 
        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }
 
        // Verificar si existe la transacción
        const existingTransaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [ id ]
        );
 
        if ( !existingTransaction ) {
            return res.status(404).json( {
                message: `No se encontró la transacción con ID ${ id }`
            } );
        }
 
        // Validar tipo si se proporciona
        if ( type && !['deposit', 'withdrawal'].includes( type ) ) {
            return res.status(400).json( {
                message: 'El tipo debe ser "deposit" o "withdrawal"'
            } );
        }
 
        // Validar casa de apuestas si se proporciona
        if ( idBookMaker ) {
            const bookMaker = await dbGet(
                'SELECT id FROM bookMakers WHERE id = ?',
                [ idBookMaker ]
            );
            if ( !bookMaker ) {
                return res.status(404).json( {
                    message: 'La casa de apuestas especificada no existe'
                } );
            }
        }
 
        const sql = `
            UPDATE transactions 
            SET idBookMaker = COALESCE(?, idBookMaker),
                type = COALESCE(?, type),
                amount = COALESCE(?, amount),
                date = COALESCE(?, date),
                info = COALESCE(?, info)
            WHERE id = ?
        `;
 
        await dbRun(
            sql,
            [ idBookMaker, type, amount, date, info, id ]
        );
 
        // Obtener la transacción actualizada
        const updatedTransaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [ id ]
        );
 
        res.status(200).json( {
            message: 'Transacción actualizada con éxito',
            data: updatedTransaction
        } );
 
    } catch (error) {
        console.error('Error al actualizar transacción:', error);
        res.status(500).json( {
            message: 'Error al actualizar la transacción',
            error: error.message
        } );
    }
 };
 

 /**
 * deleteTransaction
 * 
 * Elimina una transacción específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la transacción a eliminar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Mensaje de confirmación de eliminación
 *
 * @example
 * DELETE /api/transactions/1
 *
 * Restricciones:
 * - La transacción debe existir
 */
 const deleteTransaction = async ( req, res ) => {
    try {
        const { id } = req.params;
 
        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }
 
        // Verificar si existe la transacción
        const transaction = await dbGet(
            'SELECT * FROM transactions WHERE id = ?',
            [ id ]
        );
 
        if ( !transaction ) {
            return res.status(404).json( {
                message: `No se encontró la transacción con ID ${ id }`
            } );
        }
 
        // Proceder con la eliminación
        const deleteResult = await dbRun(
            'DELETE FROM transactions WHERE id = ?',
            [ id ]
        );
 
        if ( deleteResult.affectedRows === 0 ) {
            return res.status(404).json( {
                message: `No se pudo eliminar la transacción con ID ${ id }`
            } );
        }
 
        res.status(200).json( {
            message: 'Transacción eliminada con éxito',
            deletedId: id
        } );
 
    } catch (error) {
        console.error('Error al eliminar transacción:', error);
        res.status(500).json( {
            message: 'Error al eliminar la transacción',
            error: error.message
        } );
    }
 };
 
 export {
    getTransactions,
    getTransactionsByBookMaker,
    getTransactionStats,
    createTransaction,
    updateTransaction,
    deleteTransaction
 };


 /**
 * getBalanceByPeriod
 * 
 * Obtiene el balance en un período específico incluyendo transacciones y resultados de apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {string} req.params.startDate - Fecha inicial (YYYY-MM-DD)
 * @param {string} req.params.endDate - Fecha final (YYYY-MM-DD)
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Balance del período
 */
const getBalanceByPeriod = async ( req, res ) => {
    try {
        const { startDate, endDate } = req.params;

        // Consulta para transacciones
        const transactionsSql = `
            SELECT 
                bm.name as bookMakerName,
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as totalDeposits,
                SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as totalWithdrawals
            FROM transactions t
            JOIN bookMakers bm ON t.idBookMaker = bm.id
            WHERE t.date BETWEEN ? AND ?
            GROUP BY bm.id, bm.name
        `;

        // Consulta para resultados de apuestas
        const betsSql = `
            SELECT 
                bm.name as bookMakerName,
                SUM(result) as totalResults,
                SUM(CASE WHEN status = 'pending' THEN liability ELSE 0 END) as totalLiability
            FROM bets b
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            WHERE b.betDate BETWEEN ? AND ?
            GROUP BY bm.id, bm.name
        `;

        const [transactions, bets] = await Promise.all([
            dbAll( transactionsSql, [ startDate, endDate ] ),
            dbAll( betsSql, [ startDate, endDate ] )
        ]);

        // Combinar resultados por casa de apuestas
        const balanceByBookMaker = {};

        transactions.forEach( t => {
            balanceByBookMaker[t.bookMakerName] = {
                deposits: Number(t.totalDeposits.toFixed(2)),
                withdrawals: Number(t.totalWithdrawals.toFixed(2)),
                results: 0,
                liability: 0
            };
        });

        bets.forEach( b => {
            if ( !balanceByBookMaker[b.bookMakerName] ) {
                balanceByBookMaker[b.bookMakerName] = {
                    deposits: 0,
                    withdrawals: 0,
                };
            }
            balanceByBookMaker[b.bookMakerName].results = Number(b.totalResults.toFixed(2));
            balanceByBookMaker[b.bookMakerName].liability = Number(b.totalLiability.toFixed(2));
        });

        // Calcular totales
        let totalBalance = 0;
        Object.values(balanceByBookMaker).forEach(bm => {
            bm.balance = bm.deposits - bm.withdrawals + bm.results - bm.liability;
            totalBalance += bm.balance;
        });

        res.status(200).json({
            period: { startDate, endDate },
            totalBalance: Number(totalBalance.toFixed(2)),
            byBookMaker: balanceByBookMaker
        });

    } catch (error) {
        console.error('Error al obtener balance por período:', error);
        res.status(500).json({
            message: 'Error al obtener el balance',
            error: error.message
        });
    }
};

/**
 * getMonthlyCashflow
 * 
 * Obtiene el flujo de caja mensual
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Flujo de caja por mes
 */
const getMonthlyCashflow = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                strftime('%Y-%m', date) as month,
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
                SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as withdrawals,
                COUNT(CASE WHEN type = 'deposit' THEN 1 END) as totalDeposits,
                COUNT(CASE WHEN type = 'withdrawal' THEN 1 END) as totalWithdrawals
            FROM transactions
            GROUP BY strftime('%Y-%m', date)
            ORDER BY month DESC
        `;

        const cashflow = await dbAll( sql );

        if ( !cashflow.length ) {
            return res.status(204).send();
        }

        const enrichedCashflow = cashflow.map( month => ({
            ...month,
            deposits: Number(month.deposits.toFixed(2)),
            withdrawals: Number(month.withdrawals.toFixed(2)),
            netFlow: Number((month.deposits - month.withdrawals).toFixed(2)),
            avgDepositAmount: Number((month.deposits / month.totalDeposits || 0).toFixed(2)),
            avgWithdrawalAmount: Number((month.withdrawals / month.totalWithdrawals || 0).toFixed(2))
        }));

        res.status(200).json( enrichedCashflow );

    } catch (error) {
        console.error('Error al obtener flujo de caja:', error);
        res.status(500).json({
            message: 'Error al obtener el flujo de caja',
            error: error.message
        });
    }
};

/**
 * getDepositsSummary
 * 
 * Obtiene un resumen de los depósitos
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Resumen de depósitos
 */
const getDepositsSummary = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                bm.name as bookMakerName,
                COUNT(*) as totalDeposits,
                SUM(t.amount) as totalAmount,
                AVG(t.amount) as avgAmount,
                MIN(t.amount) as minAmount,
                MAX(t.amount) as maxAmount,
                MIN(t.date) as firstDeposit,
                MAX(t.date) as lastDeposit
            FROM transactions t
            JOIN bookMakers bm ON t.idBookMaker = bm.id
            WHERE t.type = 'deposit'
            GROUP BY bm.id, bm.name
            ORDER BY totalAmount DESC
        `;

        const summary = await dbAll( sql );

        if ( !summary.length ) {
            return res.status(204).send();
        }

        // Calcular totales generales
        const totalStats = summary.reduce((acc, curr) => ({
            totalDeposits: acc.totalDeposits + curr.totalDeposits,
            totalAmount: acc.totalAmount + curr.totalAmount
        }), { totalDeposits: 0, totalAmount: 0 });

        const enrichedSummary = summary.map( s => ({
            ...s,
            totalAmount: Number(s.totalAmount.toFixed(2)),
            avgAmount: Number(s.avgAmount.toFixed(2)),
            minAmount: Number(s.minAmount.toFixed(2)),
            maxAmount: Number(s.maxAmount.toFixed(2)),
            percentageOfTotal: Number(((s.totalAmount / totalStats.totalAmount) * 100).toFixed(2))
        }));

        res.status(200).json({
            totals: {
                totalDeposits: totalStats.totalDeposits,
                totalAmount: Number(totalStats.totalAmount.toFixed(2))
            },
            byBookMaker: enrichedSummary
        });

    } catch (error) {
        console.error('Error al obtener resumen de depósitos:', error);
        res.status(500).json({
            message: 'Error al obtener el resumen de depósitos',
            error: error.message
        });
    }
};

/**
 * getWithdrawalsSummary
 * 
 * Obtiene un resumen de los retiros
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Resumen de retiros
 */
const getWithdrawalsSummary = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                bm.name as bookMakerName,
                COUNT(*) as totalWithdrawals,
                SUM(t.amount) as totalAmount,
                AVG(t.amount) as avgAmount,
                MIN(t.amount) as minAmount,
                MAX(t.amount) as maxAmount,
                MIN(t.date) as firstWithdrawal,
                MAX(t.date) as lastWithdrawal
            FROM transactions t
            JOIN bookMakers bm ON t.idBookMaker = bm.id
            WHERE t.type = 'withdrawal'
            GROUP BY bm.id, bm.name
            ORDER BY totalAmount DESC
        `;

        const summary = await dbAll( sql );

        if ( !summary.length ) {
            return res.status(204).send();
        }

        // Calcular totales generales
        const totalStats = summary.reduce((acc, curr) => ({
            totalWithdrawals: acc.totalWithdrawals + curr.totalWithdrawals,
            totalAmount: acc.totalAmount + curr.totalAmount
        }), { totalWithdrawals: 0, totalAmount: 0 });

        const enrichedSummary = summary.map( s => ({
            ...s,
            totalAmount: Number(s.totalAmount.toFixed(2)),
            avgAmount: Number(s.avgAmount.toFixed(2)),
            minAmount: Number(s.minAmount.toFixed(2)),
            maxAmount: Number(s.maxAmount.toFixed(2)),
            percentageOfTotal: Number(((s.totalAmount / totalStats.totalAmount) * 100).toFixed(2))
        }));

        res.status(200).json({
            totals: {
                totalWithdrawals: totalStats.totalWithdrawals,
                totalAmount: Number(totalStats.totalAmount.toFixed(2))
            },
            byBookMaker: enrichedSummary
        });

    } catch (error) {
        console.error('Error al obtener resumen de retiros:', error);
        res.status(500).json({
            message: 'Error al obtener el resumen de retiros',
            error: error.message
        });
    }
};


