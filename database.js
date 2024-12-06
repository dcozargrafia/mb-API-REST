// import {createPool} from 'mysql2/promise';

// const pool = createPool({
//     host: 'localhost',
//     port: '3306',
//     user: 'usuario',
//     password: 'U8calali?',
//     database: 'PruebaMB01'
// });

// export default pool;


/**
 * Este archivo:
 * 1. Establece la conexión con la base de datos MySQL
 * 2. Configura el pool de conexiones para mejor rendimiento
 * 3. Exporta la instancia del pool para su uso en toda la aplicación
 */
import { createPool } from 'mysql2/promise';

// Configuración de la conexión
const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'PruebaMB01',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar la conexión inicial
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Conectado exitosamente a la base de datos MySQL');
        connection.release();
    } catch (error) {
        console.error('Error conectando a la base de datos:', error.message);
        // En una aplicación en producción, podrías querer terminar el proceso
        // process.exit(1);
    }
};

testConnection();

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    try {
        await pool.end();
        console.log('Conexión a la base de datos cerrada.');
        process.exit(0);
    } catch (error) {
        console.error('Error al cerrar la base de datos:', error.message);
        process.exit(1);
    }
});

export default pool;