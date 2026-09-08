/**
 * P139 demo server — wires together the two pieces documented in readme.md:
 *   1. The UDP listener (real network listener, port 13900)
 *   2. The Express HTTP API for encode/decode (port 3000)
 *
 * Run with: npm install && npm run build && node dist/server.js
 * or during development: npx ts-node src/server.ts
 */

import express from 'express';
import { startP139UdpListener } from './udp';
import p139Routes from './routes';

const app = express();
app.use(express.json());
app.use('/api/p139', p139Routes);

const HTTP_PORT = 3000;
app.listen(HTTP_PORT, () => {
    console.log(`P139 HTTP Gateway active on port ${HTTP_PORT}`);
});

const udpListener = startP139UdpListener(13900);
udpListener.on('p139_alert', (alert) => {
    console.log(`Received hazard alert from ${alert.sourceIp}:`, alert);
});
udpListener.on('error', (err) => {
    console.error('UDP listener failed to start:', err);
});