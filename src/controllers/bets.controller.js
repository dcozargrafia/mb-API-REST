import { dbAll, dbGet, dbRun } from '../utils/helpers.js';
import { calculateLiability, calculateResult } from '../utils/betCalculations.js';



/**
 * getBets
 * 
 * Obtiene todas las apuestas con soporte para filtrado y paginación
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.page=1] - Número de página
 * @param {number} [req.query.limit=10] - Límite de resultados por página
 * @param {string} [req.query.betType] - Tipo de apuesta
 * @param {string} [req.query.status] - Estado de la apuesta
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de apuestas
 */
const getBets = async ( req, res ) => {
    try {
        const { page = 1, limit = 10, betType, status } = req.query;
        const offset = ( page - 1 ) * limit;
        
        let sql = `
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b 
            JOIN bookMakers bm ON b.idBookMaker = bm.id 
            WHERE 1=1
        `;
        const params = [];

        if ( betType ) {
            sql += ' AND betType = ?';
            params.push( betType );
        }

        if ( status ) {
            sql += ' AND status = ?';
            params.push( status );
        }

        sql += ' ORDER BY betDate DESC LIMIT ? OFFSET ?';
        params.push( parseInt( limit ), parseInt( offset ) );

        const bets = await dbAll( sql, params );

        if ( !bets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( bets );
    }
    catch (error) {
        console.error('Error al obtener apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener las apuestas',
            error: error.message
        } );
    }
};

/**
 * getBetById
 * 
 * Obtiene una apuesta específica por su ID
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la apuesta a buscar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la apuesta encontrada
 */
const getBetById = async ( req, res ) => {
    try {
        const { id } = req.params;

        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        const sql = `
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            WHERE b.id = ?
        `; 
        const bet = await dbGet( sql, [ id ] );

        if ( !bet ) {
            return res.status(404).json( {
                message: `No se encontró la apuesta con ID ${ id }`
            } );
        }

        res.status(200).json( bet );

    } catch (error) {
        console.error('Error al obtener apuesta:', error);
        res.status(500).json( {
            message: 'Error al obtener la apuesta',
            error: error.message
        } );
    }
};



/**
 * createBet
 * 
 * Crea una nueva apuesta
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.body - Datos de la nueva apuesta
 * @param {number} req.body.idBookMaker - ID de la casa de apuestas
 * @param {string} req.body.bank - Tipo de banca (real/freebet)
 * @param {string} req.body.betType - Tipo de apuesta
 * @param {string} req.body.betDate - Fecha de la apuesta
 * @param {string} req.body.eventDate - Fecha del evento
 * @param {string} req.body.event - Evento
 * @param {string} req.body.bet - Apuesta realizada
 * @param {number} req.body.stake - Cantidad apostada
 * @param {number} req.body.odds - Cuota
 * @param {string} req.body.status - Estado de la apuesta
 * @param {string} [req.body.info] - Información adicional
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la apuesta creada
 */
const createBet = async ( req, res ) => {
    try {
        const { 
            idBookMaker, bank, betType, betDate, eventDate, 
            event, bet, stake, odds, status, info 
        } = req.body;

        // Validaciones básicas
        if ( !idBookMaker || !bank || !betType || !betDate || !eventDate || 
             !event || !bet || !stake || !odds || !status ) {
            return res.status(400).json( {
                message: 'Todos los campos son obligatorios excepto info'
            } );
        }

        // Validar bank
        if ( !['real', 'freebet'].includes( bank ) ) {
            return res.status(400).json( {
                message: 'El tipo de banca debe ser "real" o "freebet"'
            } );
        }

        // Validar betType
        const validTypes = ['backBet', 'layBet', 'mugBet', 'freeBet', 'personal', 'other'];
        if ( !validTypes.includes( betType ) ) {
            return res.status(400).json( {
                message: 'Tipo de apuesta no válido'
            } );
        }

        // Validar status
        if ( !['pending', 'won', 'lost'].includes( status ) ) {
            return res.status(400).json( {
                message: 'Estado de apuesta no válido'
            } );
        }

        // Validar que la casa de apuestas existe
        const bookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?',
            [ idBookMaker ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: 'La casa de apuestas especificada no existe'
            } );
        }

        // Calcular liability y result
        const liability = calculateLiability( status, betType, stake, odds );
        const result = calculateResult( 
            status, 
            betType, 
            stake, 
            odds, 
            liability,
            bookMaker.commission  
        );

        const sql = `
            INSERT INTO bets (
                idBookMaker, bank, betType, betDate, eventDate,
                event, bet, stake, odds, status, liability,
                result, info
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertResult = await dbRun(
            sql,
            [ 
                idBookMaker, bank, betType, betDate, eventDate,
                event, bet, stake, odds, status, liability,
                result, info 
            ]
        );

        res.status(201).json( {
            message: 'Apuesta creada con éxito',
            data: {
                id: insertResult.insertId,
                idBookMaker,
                bank,
                betType,
                betDate,
                eventDate,
                event,
                bet,
                stake,
                odds,
                status,
                liability,
                result,
                info
            }
        } );

    } catch (error) {
        console.error('Error al crear apuesta:', error);
        res.status(500).json( {
            message: 'Error al crear la apuesta',
            error: error.message
        } );
    }
};


/**
* updateBet
* 
* Actualiza una apuesta existente
*
* @param {Object} req - Objeto de solicitud HTTP
* @param {Object} req.params - Parámetros de la solicitud
* @param {number} req.params.id - ID de la apuesta a actualizar
* @param {Object} req.body - Datos a actualizar
* @param {Object} res - Objeto de respuesta HTTP
* @throws {Error} Si ocurre un error interno en el servidor
* @returns {Object} Datos de la apuesta actualizada
*/
const updateBet = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { 
            idBookMaker, bank, betType, betDate, eventDate,
            event, bet, stake, odds, status, info 
        } = req.body;
 
        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }
 
        // Verificar si existe la apuesta
        const existingBet = await dbGet(
            'SELECT * FROM bets WHERE id = ?',
            [ id ]
        );
 
        if ( !existingBet ) {
            return res.status(404).json( {
                message: `No se encontró la apuesta con ID ${ id }`
            } );
        }
 
        // Si se proporciona idBookMaker, verificar que existe
        if ( idBookMaker ) {
            const bookMaker = await dbGet(
                'SELECT * FROM bookMakers WHERE id = ?',
                [ idBookMaker ]
            );
            if ( !bookMaker ) {
                return res.status(404).json( {
                    message: 'La casa de apuestas especificada no existe'
                } );
            }
        }
 
        // Validaciones de los campos si están presentes
        if ( bank && !['real', 'freebet'].includes( bank ) ) {
            return res.status(400).json( {
                message: 'El tipo de banca debe ser "real" o "freebet"'
            } );
        }
 
        if ( betType && !['backBet', 'layBet', 'mugBet', 'freeBet', 'personal', 'other'].includes( betType ) ) {
            return res.status(400).json( {
                message: 'Tipo de apuesta no válido'
            } );
        }
 
        if ( status && !['pending', 'won', 'lost'].includes( status ) ) {
            return res.status(400).json( {
                message: 'Estado de apuesta no válido'
            } );
        }
 
        // Preparar datos finales para la actualización
        const finalBetType = betType || existingBet.betType;
        const finalStake = stake || existingBet.stake;
        const finalOdds = odds || existingBet.odds;
        const finalStatus = status || existingBet.status;
 
        // Calcular liability y result con los datos finales
        const liability = calculateLiability( status, betType, stake, odds );
        const result = calculateResult( 
            status, 
            betType, 
            stake, 
            odds, 
            liability,
            bookMaker.commission  
        );
 
        const sql = `
            UPDATE bets 
            SET idBookMaker = COALESCE(?, idBookMaker),
                bank = COALESCE(?, bank),
                betType = COALESCE(?, betType),
                betDate = COALESCE(?, betDate),
                eventDate = COALESCE(?, eventDate),
                event = COALESCE(?, event),
                bet = COALESCE(?, bet),
                stake = COALESCE(?, stake),
                odds = COALESCE(?, odds),
                status = COALESCE(?, status),
                liability = ?,
                result = ?,
                info = COALESCE(?, info)
            WHERE id = ?
        `;
 
        await dbRun(
            sql,
            [ 
                idBookMaker, bank, betType, betDate, eventDate,
                event, bet, stake, odds, status, liability,
                result, info, id 
            ]
        );
 
        // Obtener la apuesta actualizada
        const updatedBet = await dbGet(
            `SELECT b.*, bm.name as bookMakerName 
             FROM bets b
             JOIN bookMakers bm ON b.idBookMaker = bm.id
             WHERE b.id = ?`,
            [ id ]
        );
 
        res.status(200).json( {
            message: 'Apuesta actualizada con éxito',
            data: updatedBet
        } );
 
    } catch (error) {
        console.error('Error al actualizar apuesta:', error);
        res.status(500).json( {
            message: 'Error al actualizar la apuesta',
            error: error.message
        } );
    }
 };


 /**
* deleteBet
* 
* Elimina una apuesta específica
*
* @param {Object} req - Objeto de solicitud HTTP
* @param {Object} req.params - Parámetros de la solicitud
* @param {number} req.params.id - ID de la apuesta a eliminar
* @param {Object} res - Objeto de respuesta HTTP
* @throws {Error} Si ocurre un error interno en el servidor
* @returns {Object} Mensaje de confirmación de eliminación
*/
const deleteBet = async ( req, res ) => {
    try {
        const { id } = req.params;
 
        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }
 
        // Verificar si existe la apuesta
        const bet = await dbGet(
            'SELECT * FROM bets WHERE id = ?',
            [ id ]
        );
 
        if ( !bet ) {
            return res.status(404).json( {
                message: `No se encontró la apuesta con ID ${ id }`
            } );
        }
 
        // Verificar el estado de la apuesta
        if ( bet.status === 'won' || bet.status === 'lost' ) {
            return res.status(400).json( {
                message: 'No se puede eliminar una apuesta ya resuelta'
            } );
        }
 
        // Proceder con la eliminación
        const deleteResult = await dbRun(
            'DELETE FROM bets WHERE id = ?',
            [ id ]
        );
 
        if ( deleteResult.affectedRows === 0 ) {
            return res.status(404).json( {
                message: `No se pudo eliminar la apuesta con ID ${ id }`
            } );
        }
 
        res.status(200).json( {
            message: 'Apuesta eliminada con éxito',
            deletedId: id
        } );
 
    } catch (error) {
        console.error('Error al eliminar apuesta:', error);
        res.status(500).json( {
            message: 'Error al eliminar la apuesta',
            error: error.message
        } );
    }
 };


 /**
 * getBetsByBookMaker
 * 
 * Obtiene todas las apuestas de una casa de apuestas específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.idBookMaker - ID de la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de apuestas de la casa de apuestas
 */
const getBetsByBookMaker = async ( req, res ) => {
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
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b 
            JOIN bookMakers bm ON b.idBookMaker = bm.id 
            WHERE b.idBookMaker = ?
            ORDER BY b.betDate DESC
        `;
        
        const bets = await dbAll( sql, [ idBookMaker ] );
        
        if ( !bets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( bets );

    } catch (error) {
        console.error('Error al obtener apuestas por casa de apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener las apuestas',
            error: error.message
        } );
    }
};

/**
 * getBetStats
 * 
 * Obtiene estadísticas generales de apuestas por casa de apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Estadísticas de apuestas por casa de apuestas
 */
const getBetStats = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                bm.name as bookMakerName,
                COUNT(*) as totalBets,
                SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as wonBets,
                SUM(CASE WHEN b.status = 'lost' THEN 1 ELSE 0 END) as lostBets,
                SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pendingBets,
                SUM(b.stake) as totalStaked,
                SUM(CASE 
                    WHEN b.status = 'won' THEN b.result 
                    WHEN b.status = 'lost' THEN b.result
                    ELSE 0 
                END) as totalResult,
                SUM(CASE
                    WHEN b.betType = 'layBet' THEN b.liability
                    ELSE b.stake
                END) as totalLiability,
                MIN(b.betDate) as firstBet,
                MAX(b.betDate) as lastBet
            FROM bets b
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            GROUP BY bm.id, bm.name
            ORDER BY bm.name
        `;

        const stats = await dbAll( sql );
        
        if ( !stats.length ) {
            return res.status(204).send();
        }

        // Calcular estadísticas adicionales para cada casa de apuestas
        const enhancedStats = stats.map( stat => ({
            ...stat,
            winRate: Number(((stat.wonBets / (stat.wonBets + stat.lostBets)) * 100 || 0).toFixed(2)),
            avgStake: Number((stat.totalStaked / stat.totalBets).toFixed(2)),
            roi: Number(((stat.totalResult / stat.totalStaked) * 100 || 0).toFixed(2))
        }));

        res.status(200).json( enhancedStats );

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json( {
            message: 'Error al obtener las estadísticas',
            error: error.message
        } );
    }
};


/**
 * getBetsByStatus
 * 
 * Obtiene todas las apuestas con un estado específico
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud 
 * @param {string} req.params.status - Estado de las apuestas a buscar (pending/won/lost)
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de apuestas del estado especificado
 */
const getBetsByStatus = async ( req, res ) => {
    try {
        const { status } = req.params;

        // Validar estado
        if ( !['pending', 'won', 'lost'].includes( status ) ) {
            return res.status(400).json( {
                message: 'Estado no válido. Debe ser: pending, won o lost'
            } );
        }

        const sql = `
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b 
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            WHERE b.status = ?
            ORDER BY b.betDate DESC
        `;

        const bets = await dbAll( sql, [ status ] );

        if ( !bets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( bets );

    } catch (error) {
        console.error('Error al obtener apuestas por estado:', error);
        res.status(500).json( {
            message: 'Error al obtener las apuestas',
            error: error.message
        } );
    }
};

/**
 * getBetsByPeriod
 * 
 * Obtiene todas las apuestas en un rango de fechas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {string} req.params.startDate - Fecha inicial (YYYY-MM-DD)
 * @param {string} req.params.endDate - Fecha final (YYYY-MM-DD)
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de apuestas en el período
 */
const getBetsByPeriod = async ( req, res ) => {
    try {
        const { startDate, endDate } = req.params;

        const sql = `
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b 
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            WHERE b.betDate BETWEEN ? AND ?
            ORDER BY b.betDate DESC
        `;

        const bets = await dbAll( sql, [ startDate, endDate ] );

        if ( !bets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( bets );

    } catch (error) {
        console.error('Error al obtener apuestas por período:', error);
        res.status(500).json( {
            message: 'Error al obtener las apuestas',
            error: error.message
        } );
    }
};

/**
 * getDailyBetsSummary
 * 
 * Obtiene un resumen de las apuestas agrupadas por día
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Resumen diario de apuestas
 */
const getDailyBetsSummary = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                DATE(betDate) as date,
                COUNT(*) as totalBets,
                SUM(stake) as totalStaked,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wonBets,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lostBets,
                SUM(result) as totalResult
            FROM bets
            GROUP BY DATE(betDate)
            ORDER BY DATE(betDate) DESC
        `;

        const summary = await dbAll( sql );

        if ( !summary.length ) {
            return res.status(204).send();
        }

        // Enriquecer datos con cálculos adicionales
        const enrichedSummary = summary.map( day => ({
            ...day,
            winRate: Number(((day.wonBets / (day.wonBets + day.lostBets)) * 100 || 0).toFixed(2)),
            avgStake: Number((day.totalStaked / day.totalBets).toFixed(2)),
            totalStaked: Number(day.totalStaked.toFixed(2)),
            totalResult: Number(day.totalResult.toFixed(2))
        }));

        res.status(200).json( enrichedSummary );

    } catch (error) {
        console.error('Error al obtener resumen diario:', error);
        res.status(500).json( {
            message: 'Error al obtener el resumen',
            error: error.message
        } );
    }
};

/**
 * getMonthlyBetsSummary
 * 
 * Obtiene un resumen de las apuestas agrupadas por mes
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Resumen mensual de apuestas
 */
const getMonthlyBetsSummary = async ( req, res ) => {
    try {
        const sql = `
            SELECT 
                strftime('%Y-%m', betDate) as month,
                COUNT(*) as totalBets,
                SUM(stake) as totalStaked,
                SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wonBets,
                SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lostBets,
                SUM(result) as totalResult,
                AVG(odds) as avgOdds
            FROM bets
            GROUP BY strftime('%Y-%m', betDate)
            ORDER BY month DESC
        `;

        const summary = await dbAll( sql );

        if ( !summary.length ) {
            return res.status(204).send();
        }

        // Enriquecer datos con cálculos adicionales
        const enrichedSummary = summary.map( month => ({
            ...month,
            winRate: Number(((month.wonBets / (month.wonBets + month.lostBets)) * 100 || 0).toFixed(2)),
            avgStake: Number((month.totalStaked / month.totalBets).toFixed(2)),
            roi: Number(((month.totalResult / month.totalStaked) * 100 || 0).toFixed(2)),
            totalStaked: Number(month.totalStaked.toFixed(2)),
            totalResult: Number(month.totalResult.toFixed(2)),
            avgOdds: Number(month.avgOdds.toFixed(2))
        }));

        res.status(200).json( enrichedSummary );

    } catch (error) {
        console.error('Error al obtener resumen mensual:', error);
        res.status(500).json( {
            message: 'Error al obtener el resumen',
            error: error.message
        } );
    }
};

/**
 * getBetsByType
 * 
 * Obtiene todas las apuestas de un tipo específico
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {string} req.params.betType - Tipo de apuesta a buscar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de apuestas del tipo especificado
 */
const getBetsByType = async ( req, res ) => {
    try {
        const { betType } = req.params;
        
        // Validar tipo de apuesta
        const validTypes = ['backBet', 'layBet', 'mugBet', 'freeBet', 'personal', 'other'];
        if ( !validTypes.includes( betType ) ) {
            return res.status(400).json( {
                message: 'Tipo de apuesta no válido',
                validTypes
            } );
        }

        const sql = `
            SELECT b.*, bm.name as bookMakerName 
            FROM bets b 
            JOIN bookMakers bm ON b.idBookMaker = bm.id
            WHERE b.betType = ?
            ORDER BY b.betDate DESC
        `;

        const bets = await dbAll( sql, [ betType ] );

        if ( !bets.length ) {
            return res.status(204).send();
        }

        res.status(200).json( bets );

    } catch (error) {
        console.error('Error al obtener apuestas por tipo:', error);
        res.status(500).json( {
            message: 'Error al obtener las apuestas',
            error: error.message
        } );
    }
};