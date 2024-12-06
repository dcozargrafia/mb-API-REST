/**
* Controlador para la gestión de casas de apuestas (bookies)
* 
* Índice de funciones:
* 
* Operaciones CRUD:
* - getBookMakers()
*   Obtiene todas las casas de apuestas
* 
* - getBookMakerById( id )
*   Obtiene una casa de apuestas específica
*   Params: id - ID de la casa de apuestas
* 
* - createBookMaker( name, type, comission, info )
*   Crea una nueva casa de apuestas
*   Body: {
*     name: string (único),
*     type: string ('regular'|'exchange'),
*     comission: number (0-100),
*     initialBalance: number (por defecto 0)
*     info: string
*   }
* 
* - updateBookMaker( id, camposActualizar )
*   Actualiza una casa de apuestas existente
*   Params: id - ID de la casa de apuestas
*   Body: campos a actualizar (todos opcionales )
* 
* - deleteBookMaker( id )
*   Elimina una casa de apuestas
*   Params: id - ID de la casa de apuestas
*/


import { dbAll, dbGet, dbRun } from '../utils/helpers'

/**
 * getBookMakers
 *
 * Obtiene todas las casas de apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Array<Object>} Lista de todas las casas de apuestas
 *
 * @example
 * GET /api/bookMakers
 */
const getBookMakers = async ( req, res ) => {
    try {
        const sql = 'SELECT * FROM bookMakers';
        const bookMakers = await dbAll( sql );  
        
        if (!bookMakers.length) {
            return res.status(204).send(); 
        }

        res.status(200).json( bookMakers );
    }
    catch (error) {
        console.error('Error al obtener Casas de Apuestas:', error);
        res.status(500).json( {  
            message: 'Error al obtener las Casas de Apuestas',
            error: error.message
        });
    }
};



/**
 * Obtiene una casa de apuestas específica por su ID
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas a buscar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Datos de la casa de apuestas encontrada
 *
 * @example
 * GET /api/bookMakers/1
 */
const getBookMakerById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        const sql = 'SELECT * FROM bookMakers WHERE id = ?'; 
        const bookMaker = await dbGet( sql, [ id ] );

        if (!bookMaker) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        res.status(200).json( bookMaker );

    } catch (error) {
        console.error('Error al obtener Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener la Casa de Apuestas',
            error: error.message
        } );
    }
};


/**
 * Crea una nueva casa de apuestas
 * 
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.body - Contiene los datos de la nueva casa de apuestas
 * @param {string} req.body.name - Nombre de la casa de apuestas
 * @param {string} req.body.type - Tipo de la casa de apuestas
 * @param {number} req.body.comission - Comisión de la casa de apuestas
 * @param {number} req.body.initialBalance - Saldo inicial de la casa de apuestas
 * @param {string} req.body.info - Información extra sobre la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Mensaje de éxito con el ID de la nueva casa de apuestas
 * 
 * @example
 * POST /api/bookMakers
 * Body:
 * {
 *   "name": "Winamax",
 *   "type": "regular",
 *   "comission": 0,
 *   "initialBalance": 120.30,
 *   "info": "Muy buenas promociones"
 * }
 * 
 */
const createBookMaker = async ( req, res ) => {
    try {
        const { name, type, comission, info, initialBalance } = req.body;

        // validación de campos requeridos
        if ( !name || !type || comission === undefined || initialBalance === undefined) {
            return res.status(400).json( {
                message: 'Los campos name, type y comission son obligatorios'
            } );
        }

        // validación de tipo
        const validTypes = [ 'regular', 'exchange' ];
        if ( !validTypes.includes( type ) ) {
            return res.status(400).json( {
                message: 'El tipo debe ser "regular" o "exchange"'
            } );
        }

        // validación de comisión
        if ( typeof comission !== 'number' || comission < 0 || comission > 100 ) {
            return res.status(400).json( {
                message: 'La comisión debe ser un número entre 0 y 100'
            } );
        } 

        // validación de saldo inicial
        if ( typeof initialBalance !== 'number' ) {
            return res.status(400).json( {
                message: 'El saldo inicial debe ser un número'
            } );
        }

        // validación de longitudes de strings
        if ( name && name.length > 100 ) {
            return res.status(400).json( {
                message: 'El nombre no puede exceder los 100 caracteres'
            } );
        }
        
        if ( info && info.length > 500 ) {
            return res.status(400).json( {
                message: 'La información no puede exceder los 500 caracteres'
            } );
        }

        // verificar si ya existe una Casa de Apuestas con el mismo nombre
        const existingBookMaker = await dbGet( 
            'SELECT id FROM bookMakers WHERE name = ?',
            [ name ]
        );

        if ( existingBookMaker ) {
            return res.status(409).json( {
                message: `Ya existe una Casa de Apuestas con el nombre: ${ name }`
            });
        }

        // inserción en la BBDD

        const sql = `
            INSERT INTO bookMakers (name, type, comission, info, initialBalance) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await dbRun( 
            sql,
            [ name, type, comission, info, initialBalance ] 
        );

        res.status(201).json( {
            message: 'Casa de Apuestas creada con éxito',
            data: {
                id: result.insertId,
                name, 
                type,
                comission, 
                info
            }
        });
 
    } 
    catch (error) {
        console.error('Error al crear la Casas de Apuestas', error);
        res.status(500).json( { 
            message: 'Error al crear la Casa de Apuestas',
            error: error.message 
        } );
    }
 };


/**
 * updateBookMaker
 * 
 * Actualiza una casa de apuestas existente
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas a actualizar
 * @param {Object} req.body - Datos a actualizar
 * @param {string} [req.body.name] - Nuevo nombre de la casa de apuestas  
 * @param {string} [req.body.type] - Nuevo tipo de la casa de apuestas
 * @param {number} [req.body.comission] - Nueva comisión de la casa de apuestas
 * @param {number} [req.body.initialBalance] - Nuevo saldo inicial
 * @param {string} [req.body.info] - Nueva info de la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Los datos actualizados de la casa de apuestas
 */
const updateBookMaker = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { name, type, comission, info, initialBalance } = req.body;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe
        const existingBookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?', 
            [ id ]
        );

        if ( !existingBookMaker ) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        // Validaciones de los campos si están presentes
        if ( type && !['regular', 'exchange'].includes( type ) ) {
            return res.status(400).json( {
                message: 'El tipo debe ser "regular" o "exchange"'
            } );
        }

        if ( comission !== undefined && 
            ( typeof comission !== 'number' || comission < 0 || comission > 100 ) 
        ) {
            return res.status(400).json( {
                message: 'La comisión debe ser un número entre 0 y 100'
            } );
        }

        if ( initialBalance !== undefined && typeof initialBalance !== 'number' ) {
            return res.status(400).json( {
                message: 'El saldo inicial debe ser un número'
            } );
        }

        if ( name ) {
            const nameExists = await dbGet(
                'SELECT id FROM bookMakers WHERE name = ? AND id != ?', 
                [ name, id ]
            );
            if ( nameExists ) {
                return res.status(409).json( {
                    message: `Ya existe otra Casa de Apuestas con el nombre "${ name }"`
                } );
            }
        }

        const sql = `
            UPDATE bookMakers 
            SET name = COALESCE(?, name),
                type = COALESCE(?, type),
                comission = COALESCE(?, comission),
                initialBalance = COALESCE(?, initialBalance),
                info = COALESCE(?, info)
            WHERE id = ?
        `;

        await dbRun(
            sql, 
            [ name, type, comission, initialBalance, info, id ] 
        );

        // Obtener la casa de apuestas actualizada
        const updatedBookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?', 
            [ id ]
        );

        res.status(200).json( {
            message: 'Casa de Apuestas actualizada con éxito',
            data: updatedBookMaker
        } );

    } catch (error) {
        console.error('Error al actualizar Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al actualizar la Casa de Apuestas',
            error: error.message
        } );
    }
};


 /**
 * Elimina una casa de apuestas por su ID
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas a eliminar
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Mensaje de confirmación de eliminación
 *
 * @example
 * DELETE /api/bookMakers/1
 */
const deleteBookMaker = async ( req, res ) => {
    try {
        const { id } = req.params;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ))  {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si la casa de apuestas existe
        const bookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?',
            [ id ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        // Verificar apuestas asociadas
        const [ associatedBetsCount ] = await dbAll(
            'SELECT COUNT(*) as count FROM bets WHERE idBookMaker = ?',
            [ id ]
        );

        if ( associatedBetsCount.count > 0 ) {
            return res.status(409).json( {
                message: 'No se puede eliminar la Casa de Apuestas porque tiene apuestas asociadas',
                associatedBets: associatedBetsCount.count
            } );
        }

        // Verificar transacciones asociadas
        const [ transactionCount ] = await dbAll(
            'SELECT COUNT(*) as count FROM transactions WHERE idBookMaker = ?',
            [ id ]
        );

        if ( transactionCount.count > 0 ) {
            return res.status(409).json( {
                message: 'No se puede eliminar la Casa de Apuestas porque tiene transacciones asociadas',
                associatedTransactions: transactionCount.count
            } );
        }

        // Verificar freebets asociados
        const [ freebetCount]  = await dbAll(
            'SELECT COUNT(*) as count FROM freebets WHERE idBookMaker = ?',
            [ id ]
        );

        if ( freebetCount.count > 0 ) {
            return res.status(409).json( {
                message: 'No se puede eliminar la Casa de Apuestas porque tiene freebets asociados',
                associatedFreebets: freebetCount.count
            } );
        }

        // Proceder con la eliminación
        const deleteResult = await dbRun(
            'DELETE FROM bookMakers WHERE id = ?',
            [ id ]
        );

        if ( deleteResult.affectedRows === 0 ) {
            return res.status(404).json( {
                message: `No se pudo eliminar la casa de apuestas con ID ${id}`
            } );
        }

        res.status(200).json( {
            message: 'Casa de Apuestas eliminada con éxito',
            deletedId: id
        } );

    } catch (error) {
        console.error(' Error al eliminar Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al eliminar la Casa de Apuestas',
            error: error.message
        } );
    }
};


export {
    getBookMakers,
    getBookMakerById,
    createBookMaker,
    updateBookMaker,
    deleteBookMaker
};


/**
 * getBookMakerBalance
 * 
 * Obtiene el saldo actual de una casa de apuestas específica
 * calculado como: depósitos - retiros + resultados - responsabilidades pendientes
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Saldo y desglose de la casa de apuestas
 */
const getBookMakerBalance = async ( req, res ) => {
    try {
        const { id } = req.params;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe la casa de apuestas
        const bookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?',
            [ id ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        // Obtener totales de transacciones
        const transactionsSql = `
            SELECT
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as totalDeposits,
                SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as totalWithdrawals
            FROM transactions
            WHERE idBookMaker = ?
        `;
        const transactionsResult = await dbGet( transactionsSql, [ id ] );

        // Obtener totales de apuestas
        const betsSql = `
            SELECT
                SUM(result) as totalResults,
                SUM(CASE WHEN status = 'pending' THEN liability ELSE 0 END) as totalLiability
            FROM bets
            WHERE idBookMaker = ?
        `;
        const betsResult = await dbGet( betsSql, [ id ] );

        // Calcular saldo
        const totalDeposits = transactionsResult.totalDeposits || 0;
        const totalWithdrawals = transactionsResult.totalWithdrawals || 0;
        const totalResults = betsResult.totalResults || 0;
        const totalLiability = betsResult.totalLiability || 0;

        const balance = bookMaker.initialBalance + totalDeposits - totalWithdrawals + totalResults - totalLiability;

        res.status(200).json( {
            bookMakerName: bookMaker.name,
            balance: Number(balance.toFixed(2)),
            breakdown: {
                initialBalance: Number(bookMaker.initialBalance.toFixed(2)),
                totalDeposits: Number(totalDeposits.toFixed(2)),
                totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
                totalResults: Number(totalResults.toFixed(2)),
                totalLiability: Number(totalLiability.toFixed(2))
            }
        } );

    } catch (error) {
        console.error('Error al obtener saldo de Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener el saldo',
            error: error.message
        } );
    }
};


/**
 * getBookMakerActivity
 * 
 * Obtiene la actividad reciente de una casa de apuestas específica
 * incluyendo sus últimas transacciones y apuestas
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas
 * @param {Object} req.query - Parámetros de consulta
 * @param {number} [req.query.limit=10] - Número de registros a obtener
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Actividad reciente de la casa de apuestas
 */
const getBookMakerActivity = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe la casa de apuestas
        const bookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?',
            [ id ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        // Obtener últimas transacciones
        const transactionsSql = `
            SELECT 
                'transaction' as activityType,
                id,
                date,
                type,
                amount,
                info
            FROM transactions 
            WHERE idBookMaker = ?
            ORDER BY date DESC 
            LIMIT ?
        `;
        
        // Obtener últimas apuestas
        const betsSql = `
            SELECT 
                'bet' as activityType,
                id,
                betDate as date,
                betType as type,
                stake as amount,
                status,
                result,
                event,
                info
            FROM bets 
            WHERE idBookMaker = ?
            ORDER BY betDate DESC 
            LIMIT ?
        `;

        const [transactions, bets] = await Promise.all([
            dbAll( transactionsSql, [ id, limit ] ),
            dbAll( betsSql, [ id, limit ] )
        ]);

        // Combinar y ordenar por fecha
        const activity = [...transactions, ...bets]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);

        res.status(200).json( {
            bookMakerName: bookMaker.name,
            activity
        } );

    } catch (error) {
        console.error('Error al obtener actividad de Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener la actividad',
            error: error.message
        } );
    }
};

/**
 * getBookMakerPerformance
 * 
 * Obtiene análisis de rendimiento de una casa de apuestas específica
 *
 * @param {Object} req - Objeto de solicitud HTTP
 * @param {Object} req.params - Parámetros de la solicitud
 * @param {number} req.params.id - ID de la casa de apuestas
 * @param {Object} req.query - Parámetros de consulta
 * @param {string} [req.query.startDate] - Fecha inicial para el análisis
 * @param {string} [req.query.endDate] - Fecha final para el análisis
 * @param {Object} res - Objeto de respuesta HTTP
 * @throws {Error} Si ocurre un error interno en el servidor
 * @returns {Object} Métricas de rendimiento de la casa de apuestas
 */
const getBookMakerPerformance = async ( req, res ) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Validar que id sea un número
        if ( !Number.isInteger( Number( id ) ) ) {
            return res.status(400).json( {
                message: 'El ID debe ser un número entero'
            } );
        }

        // Verificar si existe la casa de apuestas
        const bookMaker = await dbGet(
            'SELECT * FROM bookMakers WHERE id = ?',
            [ id ]
        );

        if ( !bookMaker ) {
            return res.status(404).json( {
                message: `No se encontró la Casa de Apuestas con ID ${ id }`
            } );
        }

        let dateFilter = '';
        const params = [ id ];

        if ( startDate && endDate ) {
            dateFilter = ' AND betDate BETWEEN ? AND ?';
            params.push( startDate, endDate );
        }

        const sql = `
            SELECT 
                COUNT(*) as totalBets,
                COUNT(CASE WHEN status = 'won' THEN 1 END) as wonBets,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lostBets,
                SUM(stake) as totalStaked,
                SUM(result) as totalProfit,
                AVG(stake) as avgStake,
                AVG(odds) as avgOdds,
                MIN(odds) as minOdds,
                MAX(odds) as maxOdds,
                COUNT(DISTINCT betType) as betTypesUsed
            FROM bets 
            WHERE idBookMaker = ?${dateFilter}
        `;

        const performance = await dbGet( sql, params );

        // Calcular métricas adicionales
        const enrichedPerformance = {
            ...performance,
            winRate: Number(((performance.wonBets / (performance.wonBets + performance.lostBets)) * 100 || 0).toFixed(2)),
            roi: Number(((performance.totalProfit / performance.totalStaked) * 100 || 0).toFixed(2)),
            avgStake: Number(performance.avgStake?.toFixed(2) || 0),
            avgOdds: Number(performance.avgOdds?.toFixed(2) || 0),
            totalProfit: Number(performance.totalProfit?.toFixed(2) || 0),
            totalStaked: Number(performance.totalStaked?.toFixed(2) || 0)
        };

        res.status(200).json( {
            bookMakerName: bookMaker.name,
            period: {
                startDate: startDate || 'All time',
                endDate: endDate || 'All time'
            },
            performance: enrichedPerformance
        } );

    } catch (error) {
        console.error('Error al obtener rendimiento de Casa de Apuestas:', error);
        res.status(500).json( {
            message: 'Error al obtener el rendimiento',
            error: error.message
        } );
    }
};

export {
    // ... exports previos
    getBookMakerActivity,
    getBookMakerPerformance
};