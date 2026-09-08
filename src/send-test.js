/**
 * P139 UDP send-test script
 *
 * Sends a single, real encoded P139 packet over UDP to a running
 * P139 listener (default: localhost:13900). Use this to confirm
 * end-to-end that your server (node dist/server.js) is actually
 * receiving and decoding packets, not just that it started up.
 *
 * SETUP:
 *   Place this file in the project's `src/` folder (next to
 *   package.json), alongside the already-compiled `dist/` folder.
 *
 * USAGE:
 *   1. In one terminal: node dist/server.js         (starts the listener)
 *   2. In a second terminal, from the same src/ folder: node send-test.js
 *
 * You should see this script print "Packet sent", and the server's
 * terminal should log a line starting with "[P139] Hazard UDP burst: ...".
 *
 * Optional: pass a different host/port as arguments, e.g.
 *   node send-test.js 192.168.1.50 13900
 */

const dgram = require('dgram');
const path = require('path');

// Pull the real encoder from the compiled build, so this test uses
// the exact same encode logic as the server — not a hand-rolled copy.
const { encodePacketV2, MessageType, Severity } = require(
  path.join(__dirname, 'dist', 'encoder.js')
);

const HOST = process.argv[2] || '127.0.0.1';
const PORT = parseInt(process.argv[3], 10) || 13900;

// Build a sample hazard packet — a FIRE alert, WARNING severity,
// 1500m radius, expected to last 60 minutes.
const packetInput = {
  messageType: MessageType.FIRE,
  sessionId: 123456,
  latitude: 41.2565,
  longitude: -95.9345,
  severity: Severity.WARNING,
  radiusMeters: 1500,
  durationMinutes: 60,
};

const packetBytes = encodePacketV2(packetInput);

if (packetBytes.length !== 25) {
  console.error(`ERROR: encoded packet is ${packetBytes.length} bytes, expected 25. Aborting send.`);
  process.exit(1);
}

console.log(`Encoded ${packetBytes.length}-byte packet:`, Buffer.from(packetBytes).toString('hex'));

const client = dgram.createSocket('udp4');

client.send(Buffer.from(packetBytes), PORT, HOST, (err) => {
  if (err) {
    console.error('Failed to send packet:', err);
  } else {
    console.log(`Packet sent to ${HOST}:${PORT}`);
    console.log('Check the server terminal for a "[P139] Hazard UDP burst:" log line.');
  }
  client.close();
});
