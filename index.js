const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/track', async (res, req) => {
    try{
        //får ip address fra bruger med ngrok proxi
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddresess;

        //får information fra fronted
        const { action, endpoint } = req.body;

        await pool.query(
            'INSERT INTO traffic_logs(time, ip_address, action, endpoint) VALUES(NOW(), $1, $2, $3)',
            [clientIp, action || 'page_view', endpoint || 'home']
        );

        console.log(`[TRACKED] IP: ${clientIp} | Target: ${endpoint}`);
        res.status(200).json({ status: 'logged' });
    } catch (err) {
        console.error('[TRACK ERROR]:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;

const pool = new Pool({
    connectionString: 'postgres://postgres:secretpassword@localhost:5432/postgres'
});

async function initDB() {
    try{
        await pool.query(`
            CREATE TABLE IF NOT EXISTS traffic_logs (
            time TIMESTAMPTZ NOT NULL,
            ip_address TEXT,
            method TEXT,
            endpoint TEXT,
            status_code INT,
            action TEXT
            );
            `);

            await pool.query(`
               SELECT create_hypertable('traffic_logs', 'time', if_not_exists => TRUE);
            `);
            console.log("[DB] done!");
    } catch (err) {
        console.log("[DB ERROR] error initialization pizdec:", err.message);
    }
}

app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
        const ip = req.ip || req.socket.remoteAddress;
        const method = req.method;
        const url = req.originalUrl;
        const status = res.statusCode;

        try{
            await pool.query(
                'INSERT INTO traffic_logs(time, ip_address, method, endpoint, status_code) VALUES(NOW(), $1, $2, $3, $4)',
                [ip, method, url, status]
            );
            console.log(`[DB WRITE LOGGED] ${method} ${url} -> ${status}`);
        } catch (err) {
            console.error("[DB WRITE ERROR]", err);
        }
    });

    next();
});


app.get('/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM traffic_logs ORDER BY time DESC LIMIT 10');
        console.log("[STATS REQEST] fik linjer fra base", result.rowCount);
        res.json({
            message: "den sidste 10 reqest af traffic:",
            total_records: result.rowCount,
            logs: result.rows
        });
     } catch (err) {
        console.error("[STATS ERROR]:", err.message);
        res.status(500).json({ error: err.message });
     }
});


app.get('/', (req, res) => {
    res.send('det virker godt zaebis! alle information sendes til TimescaleDB.');
});


initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[SERVER] server run på http://localhost:${PORT}`);
    });
});