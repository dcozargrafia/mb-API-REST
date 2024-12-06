// Import
import express from 'express';
import morgan from 'morgan';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url';
import 'dotenv/config';
// import cors from 'cors'   


// Initialization
const app = express();
const __dirname = dirname( fileURLToPath( import.meta.url ) );



// Settings
app.set( 'port', process.env.PORT || 3000 );



// Middlewares
app.use( morgan( 'dev' ) );
app.use( express.urlencoded( { extended: false } ) );
app.use( express.json() );
// app.use( cors() );



// Routes
// app.use( '/api/bookies', bookMakersRoutes );
// app.use( '/api/bets', betsRoutes );
// app.use( '/api/transactions', transactionsRoutes );
// app.use( '/api/freebets', freebetsRoutes );


// Public files
app.use( express.static( join( __dirname, 'public' ) ) );



// Run Server
app.listen(app.get('port'), ()=>
    console.log('Server listening on port', app.get('port')));
