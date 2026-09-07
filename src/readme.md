Markdown
# P139 Protocol Specification (p139-spec)

Deterministic 25-byte connectionless wire standard designed for emergency hazard alerts in Disconnected, Intermittent, Limited-Bandwidth (DDIL) environments[cite: 1].

## Overview

The P139 protocol provides a strict, low-overhead wire format for transmitting critical telemetry, location vectors, and emergency status flags[cite: 1]. By utilizing version-nibble header multiplexing, E7 coordinate compression, and 16-bit session hashing, it packs maximum tactical utility into a fixed 25-byte payload[cite: 1].

## Installation

```bash
npm install p139-spec
Usage
1. Encoding & Decoding Packets
TypeScript
import { encodePacketV2, decodePacket, MessageType, Severity } from 'p139-spec';

// Encode a hazard alert payload
const packetBytes = encodePacketV2({
  messageType: MessageType.FIRE,
  sessionId: 123456,
  latitude: 41.2565,
  longitude: -95.9345,
  severity: Severity.WARNING,
  radiusMeters: 1500,
  durationMinutes: 60
});

// Decode a received 25-byte buffer
const decoded = decodePacket(packetBytes);
console.log(decoded);
2. Running the UDP Listener
TypeScript
import { startP139UdpListener } from 'p139-spec';

const listener = startP139UdpListener(13900);

listener.on('p139_alert', (alert) => {
  console.log(`Received hazard alert from ${alert.sourceIp}:`, alert);
});
3. Mounting the Express API Routes
TypeScript
import express from 'express';
import { p139Routes } from 'p139-spec';

const app = express();
app.use(express.json());

// Mounts /encode, /decode, /message-types, and /status
app.use('/api/p139', p139Routes);

app.listen(3000, () => {
  console.log('P139 HTTP Gateway active on port 3000');
});
License
Apache-2.0
