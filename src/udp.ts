/**
 * P139 UDP Listener (Open Standard)
 *
 * Receives 25-byte P139 packets on port 13900.
 * Defers all byte-parsing and CRC validation to the canonical encoder.
 */

import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { decodePacket, MessageType } from './encoder';

const P139_REGISTERED_PORT = 13900;
const P139_PACKET_SIZE = 25;

/**
 * Starts the P139 UDP Listener and returns an EventEmitter.
 * Listen to 'p139_alert' events to handle incoming parsed packets.
 */
export function startP139UdpListener(port: number = P139_REGISTERED_PORT): EventEmitter {
  const emitter = new EventEmitter();
  const server = dgram.createSocket('udp4');

  server.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    if (msg.length !== P139_PACKET_SIZE) {
      console.warn(`[P139] Rejected ${msg.length}-byte packet from ${rinfo.address}`);
      return;
    }
    
    try {
      // Convert Node Buffer to Uint8Array for the canonical decoder
      const uint8Array = new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
      const payload = decodePacket(uint8Array);
      
      if (payload) {
        // Find string representation of the message type for logging
        const eventName = Object.keys(MessageType).find(
          key => (MessageType as any)[key] === payload.messageType
        ) || `UNKNOWN_${payload.messageType}`;

        if (payload.messageType !== MessageType.HEARTBEAT) {
          console.info(`[P139] Hazard UDP burst: session=${payload.sessionId} event=${eventName} lat=${payload.latitude.toFixed(7)} lon=${payload.longitude.toFixed(7)} src=${rinfo.address}:${rinfo.port}`);
        }
        
        // Expose the decoded packet + network context to the application
        emitter.emit('p139_alert', { 
          ...payload, 
          eventName,
          sourceIp: rinfo.address, 
          sourcePort: rinfo.port 
        });
      }
    } catch (err) {
      console.error(`[P139] Failed to process packet from ${rinfo.address}`, err);
    }
  });

  server.on('error', (err: Error) => {
    console.error('[P139] UDP listener error', err);
    emitter.emit('error', err);
    try { server.close(); } catch {}
  });

  server.on('listening', () => {
    const addr = server.address();
    console.info(`[P139] UDP traffic class listener active on ${addr.address}:${addr.port}`);
    emitter.emit('ready', addr);
  });

  server.bind(port);
  (emitter as any).server = server;
  
  return emitter;
}
```[cite: 6]
