/**
* Controlador para la gestión de freebets
*
* Índice de funciones:
*
* Operaciones CRUD:
* - getFreebets()
* Obtiene todas las freebets
* Query: {
*   page: number (default: 1),
*   limit: number (default: 10),
*   startDate: string (YYYY-MM-DD),
*   endDate: string (YYYY-MM-DD),
*   type: string ('freebet-on-win'|'freebet-on-loss'|'bet-and-get'|'loyalty'|'other')
* }
*
* - createFreebet()
* Crea una nueva freebet
* Body: {
*   idBookMaker: number,
*   date: string (YYYY-MM-DD),
*   type: string ('freebet-on-win'|'freebet-on-loss'|'bet-and-get'|'loyalty'|'other'),
*   amount: number,
*   event: string,
*   bet: string,
*   requirements: string,
*   status: string ('received'|'pending'|'rejected'|'claiming'|'other')
* }
*
* - updateFreebet( id )
* Actualiza una freebet existente
* Params: id - ID de la freebet
* Body: campos a actualizar (todos opcionales)
*
* - deleteFreebet( id )
* Elimina una freebet
* Params: id - ID de la freebet
*
* Operaciones adicionales:
* - getFreebetsByBookMaker( idBookMaker )
* Obtiene freebets de una casa de apuestas específica
* Params: idBookMaker - ID de la casa de apuestas
*
* - getFreebetStats()
* Obtiene estadísticas generales de freebets
* Returns: {
*   bookMakerName: string,
*   totalFreebets: number,
*   totalAmount: number,
*   byStatus: {
*     received: number,
*     pending: number,
*     rejected: number,
*     claiming: number,
*     other: number
*   }
* }
*/


import { dbAll, dbGet, dbRun } from '../utils/helpers.js';



/**
 * getFreebets
 * 
 * Obtiene todas las freebets con soporte para filtrado y paginación
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de resultados por página
 * @param {string} [req.query.type] - Tipo de freebet
 * @param {string} [req.query.status] - Estado de la freebet
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de freebets
 */
const getFreebets = async ( req, res ) => {
    try {
        const { page = 1, limit = 10, type, status } = req.query;
        const offset = ( page - 1 ) * limit;
        
        let sql = `
            SELECT f.*, b.name as bookMakerName 
            FROM freebets f 
            JOIN bookMakers b ON f.idBookMaker = b.id 
            WHERE 1=1
        `;
        const params = [];

        if ( type ) {
            sql += ' AND type = ?';
            params.push( type );
        }

        if ( status ) {
            sql += ' AND status = ?';
            params.push( status );
        }

        sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
        params.push( parseInt( limit ), parseInt( offset ) );

        const freebets = await dbAll( sql, params );

        if ( !freebets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( freebets );
    }
    catch (error) {
        console.error('Error al obtener freebets:', error);
        res.status(500).json( {
            message: 'Error al obtener las freebets',
            error: error.message
        } );
    }
};


/**
 * getFreebetById
 * 
 * Obtiene una freebet específica por su ID
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la freebet a buscar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la freebet encontrada
 */
const getFreebetById = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        const sql = `
            SELECT f.*, b.name as bookMakerName 
            FROM freebets f
            JOIN bookMakers b ON f.idBookMaker = b.id
            WHERE f.id = ?
        `; 
        const freebet = await dbGet( sql, [ id ] );

        if ( !freebet ) {
            return res.status(404).json( {
                message: `No se encontró la freebet con ID ${ id }`
            } );
        }

        res.status(200).json( freebet );

    } catch (error) {
        console.error('Error al obtener freebet:', error);
        res.status(500).json( {
            message: 'Error al obtener la freebet',
            error: error.message
        } );
    }
};


/**
 * createFreebet
 * 
 * Crea una nueva freebet
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.body - Datos de la nueva freebet
 * @param {number} req.body.idBookMaker - ID de la casa de apuestas
 * @param {string} req.body.type - Tipo de freebet
 * @param {number} req.body.amount - Monto de la freebet
 * @param {string} req.body.date - Fecha de la freebet
 * @param {string} req.body.event - Evento asociado
 * @param {string} req.body.status - Estado de la freebet
 * @param {string} [req.body.bet] - Apuesta asociada
 * @param {string} [req.body.requirements] - Requisitos de la freebet
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la freebet creada
 */
const createFreebet = async ( req, res ) => {
    try {
        const { idBookMaker, type, amount, date, event, bet, requirements, status } = req.body;

        // Validaciones
        if ( !idBookMaker || !type || !amount || !date || !event || !status ) {
            return res.status(400).json( {
                message: 'Los campos idBookMaker, type, amount, date, event y status son obligatorios'
            } );
        }

        // Validar tipo
        const validTypes = ['freebet-on-win', 'freebet-on-loss', 'bet-and-get', 'loyalty', 'other'];
        if ( !validTypes.includes( type ) ) {
            return res.status(400).json( {
                message: 'Tipo de freebet no válido'
            } );
        }

        // Validar status
        const validStatus = ['received', 'pending', 'rejected', 'claiming', 'other'];
        if ( !validStatus.includes( status ) ) {
            return res.status(400).json( {
                message: 'Estado de freebet no válido'
            } );
        }

        // Validar casa de apuestas existe
        const bookMaker = await dbGet(
            'SELECT id FROM bookMakers WHERE id = ?',
            [ idBookMaker ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: 'La casa de apuestas especificada no existe'
            } );
        }

        const sql = `
            INSERT INTO freebets (
                idBookMaker, type, amount, date, 
                event, bet, requirements, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await dbRun(
            sql,
            [ idBookMaker, type, amount, date, event, bet, requirements, status ]
        );

        res.status(201).json( {
            message: 'Freebet creada con éxito',
            data: {
                id: result.insertId,
                idBookMaker,
                type,
                amount,
                date,
                event,
                bet,
                requirements,
                status
            }
        } );

    } catch (error) {
        console.error('Error al crear freebet:', error);
        res.status(500).json( {
            message: 'Error al crear la freebet',
            error: error.message
        } );
    }
};


/**
 * updateFreebet
 * 
 * Actualiza una freebet existente
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la freebet a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la freebet actualizada
 */
const updateFreebet = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { idBookMaker, type, amount, date, event, bet, requirements, status } = req.body;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe la freebet
        const existingFreebet = await dbGet(
            'SELECT * FROM freebets WHERE id = ?',
            [ id ]
        );

        if ( !existingFreebet ) {
            return res.status(404).json( {
                message: `No se encontró la freebet con ID ${ id }`
            } );
        }

        // Validar tipo si se proporciona
        if ( type ) {
            const validTypes = ['freebet-on-win', 'freebet-on-loss', 'bet-and-get', 'loyalty', 'other'];
            if ( !validTypes.includes( type ) ) {
                return res.status(400).json( {
                    message: 'Tipo de freebet no válido'
                } );
            }
        }

        // Validar status si se proporciona
        if ( status ) {
            const validStatus = ['received', 'pending', 'rejected', 'claiming', 'other'];
            if ( !validStatus.includes( status ) ) {
                return res.status(400).json( {
                    message: 'Estado de freebet no válido'
                } );
            }
        }

        const sql = `
            UPDATE freebets 
            SET idBookMaker = COALESCE(?, idBookMaker),
                type = COALESCE(?, type),
                amount = COALESCE(?, amount),
                date = COALESCE(?, date),
                event = COALESCE(?, event),
                bet = COALESCE(?, bet),
                requirements = COALESCE(?, requirements),
                status = COALESCE(?, status)
            WHERE id = ?
        `;

        await dbRun(
            sql,
            [ idBookMaker, type, amount, date, event, bet, requirements, status, id ]
        );

        // Obtener la freebet actualizada
        const updatedFreebet = await dbGet(
            'SELECT * FROM freebets WHERE id = ?',
            [ id ]
        );

        res.status(200).json( {
            message: 'Freebet actualizada con éxito',
            data: updatedFreebet
        } );

    } catch (error) {
        console.error('Error al actualizar freebet:', error);
        res.status(500).json( {
            message: 'Error al actualizar la freebet',
            error: error.message
        } );
    }
};


/**
 * deleteFreebet
 * 
 * Elimina una freebet específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la freebet a eliminar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Mensaje de confirmación de eliminación
 */
const deleteFreebet = async ( req, res ) => {
    try {
        const { id } = req.params;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe la freebet
        const freebet = await dbGet(
            'SELECT * FROM freebets WHERE id = ?',
            [ id ]
        );

        if ( !freebet ) {
            return res.status(404).json( {
                message: `No se encontró la freebet con ID ${ id }`
            } );
        }

        // Proceder con la eliminación
        const deleteResult = await dbRun(
            'DELETE FROM freebets WHERE id = ?',
            [ id ]
        );

        if ( deleteResult.affectedRows === 0 ) {
            return res.status(404).json( {
                message: `No se pudo eliminar la freebet con ID ${ id }`
            } );
        }

        res.status(200).json( {
            message: 'Freebet eliminada con éxito',
            deletedId: id
        } );

    } catch (error) {
        console.error('Error al eliminar freebet:', error);
        res.status(500).json( {
            message: 'Error al eliminar la freebet',
            error: error.message
        } );
    }
};


/**
 * getFreebetsByBookMaker
 * 
 * Obtiene todas las freebets de una casa de apuestas específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.idBookMaker - ID de la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de freebets de la casa de apuestas
 */
const getFreebetsByBookMaker = async ( req, res ) => {
    try {
        const { idBookMaker } = req.params;

        // Validar que existe la casa de apuestas
        const bookMaker = await dbGet(
            'SELECT id FROM bookMakers WHERE id = ?',
            [ idBookMaker ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: 'La casa de apuestas especificada no existe'
            } );
        }

        const sql = `
            SELECT f.*, b.name as bookMakerName 
            FROM freebets f 
            JOIN bookMakers b ON f.idBookMaker = b.id 
            WHERE f.idBookMaker = ?
            ORDER BY f.date DESC
        `;
        
        const freebets = await dbAll( sql, [ idBookMaker ] );
        
        if ( !freebets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( freebets );

    } catch (error) {
        console.error('Error al obtener freebets por casa de apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener las freebets',
            error: error.message
        } );
    }
};


/**
 * getFreebetStats
 * 
 * Obtiene estadísticas generales de freebets por casa de apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Estadísticas de freebets por casa de apuestas
 */
const getFreebetStats = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                b.name as bookMakerName,
                COUNT(*) as totalFreebets,
                SUM(f.amount) as totalAmount,
                SUM(CASE WHEN f.status = 'received' THEN 1 ELSE 0 END) as received,
                SUM(CASE WHEN f.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN f.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN f.status = 'claiming' THEN 1 ELSE 0 END) as claiming,
                SUM(CASE WHEN f.status = 'other' THEN 1 ELSE 0 END) as other
            FROM freebets f
            JOIN bookMakers b ON f.idBookMaker = b.id
            GROUP BY b.id, b.name
        `;

        const stats = await dbAll( sql );
        res.status(200).json( stats );

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json( {
            message: 'Error al obtener las estadísticas',
            error: error.message
        } );
    }
};

export {
    getFreebets,
    getFreebetById,
    createFreebet,
    updateFreebet,
    deleteFreebet,
    getFreebetsByBookMaker,
    getFreebetStats
};

/**
 * getExpiringFreebets
 * 
 * Obtiene las freebets próximas a caducar
 * Por defecto muestra las que caducan en los próximos 7 días
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.days=7] - Días para considerar próximas a caducar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de freebets próximas a caducar
 */
const getExpiringFreebets = async ( req, res ) => {
    try {
        const { days = 7 } = req.query;

        const sql = `
            SELECT f.*, bm.name as bookMakerName
            FROM freebets f
            JOIN bookMakers bm ON f.idBookMaker = bm.id
            WHERE f.status = 'pending'
            AND date <= date('now', '+' || ? || ' days')
            AND date >= date('now')
            ORDER BY f.date ASC
        `;

        const freebets = await dbAll( sql, [ days ] );

        if ( !freebets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( {
            daysConsidered: days,
            freebets
        } );

    } catch (error) {
        console.error('Error al obtener freebets por caducar:', error);
        res.status(500).json( {
            message: 'Error al obtener las freebets',
            error: error.message
        } );
    }
};

/**
 * getFreebetsByValue
 * 
 * Obtiene freebets que superen un valor mínimo
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.minAmount - Valor mínimo de la freebet
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de freebets que cumplen el criterio
 */
const getFreebetsByValue = async ( req, res ) => {
    try {
        const { minAmount } = req.params;

        if ( !Number.isFinite( Number( minAmount ) ) || minAmount < 0 ) {
            return res.status(400).json( {
                message: 'El valor mínimo debe ser un número positivo'
            } );
        }

        const sql = `
            SELECT f.*, bm.name as bookMakerName
            FROM freebets f
            JOIN bookMakers bm ON f.idBookMaker = bm.id
            WHERE f.amount >= ?
            ORDER BY f.amount DESC
        `;

        const freebets = await dbAll( sql, [ minAmount ] );

        if ( !freebets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( {
            minAmount: Number(minAmount),
            totalFreebets: freebets.length,
            freebets
        } );

    } catch (error) {
        console.error('Error al obtener freebets por valor:', error);
        res.status(500).json( {
            message: 'Error al obtener las freebets',
            error: error.message
        } );
    }
};

/**
 * getFreebetConversionRate
 * 
 * Obtiene estadísticas de conversión de freebets a dinero real
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Estadísticas de conversión de freebets
 */
const getFreebetConversionRate = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                bm.name as bookMakerName,
                COUNT(*) as totalFreebets,
                SUM(f.amount) as totalFreebetAmount,
                AVG(f.amount) as avgFreebetAmount,
                COUNT(CASE WHEN f.status = 'received' THEN 1 END) as receivedFreebets,
                COUNT(CASE WHEN f.status = 'rejected' THEN 1 END) as rejectedFreebets,
                (
                    SELECT SUM(b.result)
                    FROM bets b
                    WHERE b.betType = 'freeBet'
                    AND b.idBookMaker = bm.id
                    AND b.status != 'pending'
                ) as totalProfit
            FROM freebets f
            JOIN bookMakers bm ON f.idBookMaker = bm.id
            GROUP BY bm.id, bm.name
            ORDER BY totalFreebetAmount DESC
        `;

        const stats = await dbAll( sql );

        if ( !stats.length ) {
            return res.status(204).send();
        }

        const enrichedStats = stats.map( s => ({
            ...s,
            totalFreebetAmount: Number(s.totalFreebetAmount?.toFixed(2) || 0),
            avgFreebetAmount: Number(s.avgFreebetAmount?.toFixed(2) || 0),
            totalProfit: Number(s.totalProfit?.toFixed(2) || 0),
            conversionRate: Number(((s.totalProfit / s.totalFreebetAmount) * 100)?.toFixed(2) || 0),
            successRate: Number(((s.receivedFreebets / s.totalFreebets) * 100)?.toFixed(2) || 0)
        }));

        // Calcular totales generales
        const totals = enrichedStats.reduce((acc, curr) => ({
            totalFreebets: acc.totalFreebets + curr.totalFreebets,
            totalAmount: acc.totalAmount + curr.totalFreebetAmount,
            totalProfit: acc.totalProfit + curr.totalProfit,
            receivedFreebets: acc.receivedFreebets + curr.receivedFreebets,
            rejectedFreebets: acc.rejectedFreebets + curr.rejectedFreebets
        }), {
            totalFreebets: 0,
            totalAmount: 0,
            totalProfit: 0,
            receivedFreebets: 0,
            rejectedFreebets: 0
        });

        res.status(200).json( {
            totals: {
                ...totals,
                overallConversionRate: Number(((totals.totalProfit / totals.totalAmount) * 100).toFixed(2)),
                overallSuccessRate: Number(((totals.receivedFreebets / totals.totalFreebets) * 100).toFixed(2))
            },
            byBookMaker: enrichedStats
        } );

    } catch (error) {
        console.error('Error al obtener tasa de conversión:', error);
        res.status(500).json( {
            message: 'Error al obtener la tasa de conversión',
            error: error.message
        } );
    }
};