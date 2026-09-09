/**
 * P139 UDP Listener (Open Standard)
 *
 * Receives 25-byte P139 packets on port 13900.
 * Defers all byte-parsing and CRC validation to the canonical encoder.
 *
 * ACK HANDLING (new):
 *  - If an incoming hazard packet has StatusFlags.ACK_REQUIRED set,
 *    this listener automatically sends back a P139 ACK packet to
 *    whoever sent it, over the same UDP socket. No new wire fields —
 *    the ACK packet uses the exact same 25-byte layout, via
 *    encodeAckPacket() from encoder.ts.
 *  - If an incoming packet IS an ACK (messageType === MessageType.ACK),
 *    this listener emits a 'p139_ack' event instead of 'p139_alert',
 *    so whatever is tracking pending sends (see ackTracker.ts) can be
 *    notified regardless of what transport is in use elsewhere.
 */

import * as dgram from 'node:dgram';
import { EventEmitter } from 'node:events';
import { decodePacket, encodeAckPacket, MessageType, StatusFlags } from './encoder';

const P139_REGISTERED_PORT = 13900;
const P139_PACKET_SIZE = 25;

/**
 * Starts the P139 UDP Listener and returns an EventEmitter.
 * Listen to 'p139_alert' events to handle incoming parsed hazard packets.
 * Listen to 'p139_ack' events to handle incoming ACK packets.
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

            if (!payload) {
                return;
            }

            // --- Incoming ACK: notify listeners, don't treat as a new alert ---
            if (payload.messageType === MessageType.ACK) {
                console.info(`[P139] ACK received for session=${payload.sessionId} from ${rinfo.address}:${rinfo.port}`);
                emitter.emit('p139_ack', {
                    hashedSessionId: payload.sessionId,
                    sourceIp: rinfo.address,
                    sourcePort: rinfo.port,
                });
                return;
            }

            // Find string representation of the message type for logging
            const eventName = Object.keys(MessageType).find(
                key => (MessageType as any)[key] === payload.messageType
            ) || `UNKNOWN_${payload.messageType}`;

            if (payload.messageType !== MessageType.HEARTBEAT) {
                console.info(`[P139] Hazard UDP burst: session=${payload.sessionId} event=${eventName} lat=${payload.latitude.toFixed(7)} lon=${payload.longitude.toFixed(7)} src=${rinfo.address}:${rinfo.port}`);
            }

            // --- Auto-ACK: reply if the sender asked for confirmation ---
            const ackRequired = (payload.statusFlags & StatusFlags.ACK_REQUIRED) !== 0;
            if (ackRequired) {
                const ackBytes = encodeAckPacket(payload.sessionId);
                server.send(Buffer.from(ackBytes), rinfo.port, rinfo.address, (err) => {
                    if (err) {
                        console.error(`[P139] Failed to send ACK to ${rinfo.address}:${rinfo.port}`, err);
                    } else {
                        console.info(`[P139] ACK sent for session=${payload.sessionId} to ${rinfo.address}:${rinfo.port}`);
                    }
                });
            }

            // Expose the decoded packet + network context to the application
            emitter.emit('p139_alert', {
                ...payload,
                eventName,
                sourceIp: rinfo.address,
                sourcePort: rinfo.port
            });
        } catch (err) {
            console.error(`[P139] Failed to process packet from ${rinfo.address}`, err);
        }
    });

    server.on('error', (err: Error) => {
        console.error('[P139] UDP listener error', err);
        emitter.emit('error', err);
        try { server.close(); } catch { }
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

















///**
// * P139 UDP Listener (Open Standard)  HERE IS THE ORIGINAL
// *
// * Receives 25-byte P139 packets on port 13900.
// * Defers all byte-parsing and CRC validation to the canonical encoder.
// */

//import * as dgram from 'node:dgram';
//import { EventEmitter } from 'node:events';
//import { decodePacket, MessageType } from './encoder';

//const P139_REGISTERED_PORT = 13900;
//const P139_PACKET_SIZE = 25;

///**
// * Starts the P139 UDP Listener and returns an EventEmitter.
// * Listen to 'p139_alert' events to handle incoming parsed packets.
// */
//export function startP139UdpListener(port: number = P139_REGISTERED_PORT): EventEmitter {
//  const emitter = new EventEmitter();
//  const server = dgram.createSocket('udp4');

//  server.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
//    if (msg.length !== P139_PACKET_SIZE) {
//      console.warn(`[P139] Rejected ${msg.length}-byte packet from ${rinfo.address}`);
//      return;
//    }
    
//    try {
//      // Convert Node Buffer to Uint8Array for the canonical decoder
//      const uint8Array = new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength);
//      const payload = decodePacket(uint8Array);
      
//      if (payload) {
//        // Find string representation of the message type for logging
//        const eventName = Object.keys(MessageType).find(
//          key => (MessageType as any)[key] === payload.messageType
//        ) || `UNKNOWN_${payload.messageType}`;

//        if (payload.messageType !== MessageType.HEARTBEAT) {
//          console.info(`[P139] Hazard UDP burst: session=${payload.sessionId} event=${eventName} lat=${payload.latitude.toFixed(7)} lon=${payload.longitude.toFixed(7)} src=${rinfo.address}:${rinfo.port}`);
//        }
        
//        // Expose the decoded packet + network context to the application
//        emitter.emit('p139_alert', { 
//          ...payload, 
//          eventName,
//          sourceIp: rinfo.address, 
//          sourcePort: rinfo.port 
//        });
//      }
//    } catch (err) {
//      console.error(`[P139] Failed to process packet from ${rinfo.address}`, err);
//    }
//  });

//  server.on('error', (err: Error) => {
//    console.error('[P139] UDP listener error', err);
//    emitter.emit('error', err);
//    try { server.close(); } catch {}
//  });

//  server.on('listening', () => {
//    const addr = server.address();
//    console.info(`[P139] UDP traffic class listener active on ${addr.address}:${addr.port}`);
//    emitter.emit('ready', addr);
//  });

//  server.bind(port);
//  (emitter as any).server = server;
  
//  return emitter;
//}
 
