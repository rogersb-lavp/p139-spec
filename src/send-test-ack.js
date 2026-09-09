/**
 * P139 ACK round-trip test
 *
 * Sends a hazard packet with StatusFlags.ACK_REQUIRED set, and uses
 * the ackTracker to confirm the server actually sends back a valid
 * ACK packet. This proves the whole flow works: encode -> send ->
 * server auto-replies -> we receive and match the ACK.
 *
 * SETUP:
 *   1. Add ackTracker.ts to src/, add encodeAckPacket() to encoder.ts,
 *      and replace udp.ts with the updated version (all provided
 *      separately). Then: npm run build
 *   2. In one terminal: node dist/server.js
 *   3. In a second terminal, from src/: node send-test-ack.js
 */

const dgram = require('dgram');
const path = require('path');

const { encodePacketV2, decodePacket, MessageType, Severity, StatusFlags } = require(
    path.join(__dirname, 'dist', 'encoder.js')
);
const { createAckTracker } = require(path.join(__dirname, 'dist', 'ackTracker.js'));

const HOST = process.argv[2] || '127.0.0.1';
const PORT = parseInt(process.argv[3], 10) || 13900;

const client = dgram.createSocket('udp4');

// The tracker needs a raw send function. We give it one that uses
// this same UDP socket — but the tracker itself has no idea it's UDP.
const tracker = createAckTracker(
    (bytes) => {
        client.send(Buffer.from(bytes), PORT, HOST);
    },
    { timeoutMs: 3000, maxRetries: 3 }
);

// Build a hazard packet that requests an ACK.
const packetInput = {
    messageType: MessageType.FIRE,
    sessionId: 123456,
    latitude: 41.2565,
    longitude: -95.9345,
    severity: Severity.WARNING,
    radiusMeters: 1500,
    durationMinutes: 60,
    statusFlags: StatusFlags.ACK_REQUIRED,
};

const packetBytes = encodePacketV2(packetInput);

// We need to know what hashed session id this packet actually carries,
// so we can match the incoming ACK to this specific send. Easiest way:
// decode our own just-encoded packet to read back the hash.
const selfDecoded = decodePacket(packetBytes);
const hashedSessionId = selfDecoded.sessionId;

console.log(`Sending hazard packet (hashed session=${hashedSessionId}), ACK requested...`);

client.on('message', (msg, rinfo) => {
    if (msg.length !== 25) return;
    const decoded = decodePacket(new Uint8Array(msg));
    if (decoded && decoded.messageType === MessageType.ACK) {
        console.log(`Received ACK from ${rinfo.address}:${rinfo.port} for session=${decoded.sessionId}`);
        tracker.onAckReceived(decoded.sessionId);
        console.log('SUCCESS: ACK round trip confirmed.');
        client.close();
    }
});

tracker.sendWithAck(hashedSessionId, packetBytes, () => {
    console.error('FAILURE: no ACK received after max retries.');
    client.close();
});