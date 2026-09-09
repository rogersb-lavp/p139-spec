/**
 * P139 Hazard Alert Protocol (Open Standard)
 * Canonical V2 encoder (version-nibble header, E7 LE coords, 16-bit hashed session ID).
 * 
 * Supports deterministic 25-byte connectionless wire frames for DDIL environments.
 */

export const PROTOCOL_VERSION = 0x02;

export const MessageType = {
  SOS: 0x01,
  MAN_OVERBOARD: 0x02,
  CRASH: 0x03,
  MEDICAL: 0x04,
  FLOOD: 0x10,
  FIRE: 0x11,
  AVALANCHE: 0x12,
  WEATHER: 0x13,
  DAM: 0x20,
  HAZMAT: 0x21,
  STRUCTURE: 0x22,
  ICE: 0x23,
  VOLCANIC: 0x30,
  WILDLIFE: 0x31,
  CIVIL: 0x32,
  RESPONDING: 0x40,
  ACK: 0x41,
  CANCEL: 0x42,
  HEARTBEAT: 0x43,
  ALL_CLEAR: 0x50,
  ESCALATE: 0x51,
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

export const Severity = {
  ADVISORY: 0x01,
  WATCH: 0x02,
  WARNING: 0x03,
  EXTREME: 0x04,
} as const;

export const StatusFlags = {
  SOS: 0x01,
  MAN_OVERBOARD: 0x02,
  LOW_BATTERY: 0x04,
  CRASH: 0x08,
  ANCHOR: 0x10,
  CRUISING: 0x20,
  HIGH_SPEED: 0x40,
  ACK_REQUIRED: 0x80,
  VERIFIED: 0x100,
  ESCALATED: 0x200,
} as const;

export interface P139PacketInput {
  messageType?: MessageTypeValue;
  sessionId: number;
  latitude: number;
  longitude: number;
  timestamp?: number;
  statusFlags?: number;
  velocityKnots?: number;
  heading?: number;
  altitudeMeters?: number;
  severity?: number;
  radiusMeters?: number;
  durationMinutes?: number;
  reserved?: number;
}

export interface P139Packet {
  version: number;
  messageType: MessageTypeValue;
  sessionId: number;
  latitude: number;
  longitude: number;
  timestamp: number;
  statusFlags: number;
  velocityOrSeverity: number;
  headingOrRadius: number;
  altitudeOrDuration: number;
  reserved: number;
  crc8: number;
}

const CRC8_TABLE: Uint8Array = new Uint8Array([
  0x00, 0x07, 0x0E, 0x09, 0x1C, 0x1B, 0x12, 0x15,
  0x38, 0x3F, 0x36, 0x31, 0x24, 0x23, 0x2A, 0x2D,
  0x70, 0x77, 0x7E, 0x79, 0x6C, 0x6B, 0x62, 0x65,
  0x48, 0x4F, 0x46, 0x41, 0x54, 0x53, 0x5A, 0x5D,
  0xE0, 0xE7, 0xEE, 0xE9, 0xFC, 0xFB, 0xF2, 0xF5,
  0xD8, 0xDF, 0xD6, 0xD1, 0xC4, 0xC3, 0xCA, 0xCD,
  0x90, 0x97, 0x9E, 0x99, 0x8C, 0x8B, 0x82, 0x85,
  0xA8, 0xAF, 0xA6, 0xA1, 0xB4, 0xB3, 0xBA, 0xBD,
  0xC7, 0xC0, 0xC9, 0xCE, 0xDB, 0xDC, 0xD5, 0xD2,
  0xFF, 0xF8, 0xF1, 0xF6, 0xE3, 0xE4, 0xED, 0xEA,
  0xB7, 0xB0, 0xB9, 0xBE, 0xAB, 0xAC, 0xA5, 0xA2,
  0x8F, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9D, 0x9A,
  0x27, 0x20, 0x29, 0x2E, 0x3B, 0x3C, 0x35, 0x32,
  0x1F, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0D, 0x0A,
  0x57, 0x50, 0x59, 0x5E, 0x4B, 0x4C, 0x45, 0x42,
  0x6F, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7D, 0x7A,
  0x89, 0x8E, 0x87, 0x80, 0x95, 0x92, 0x9B, 0x9C,
  0xB1, 0xB6, 0xBF, 0xB8, 0xAD, 0xAA, 0xA3, 0xA4,
  0xF9, 0xFE, 0xF7, 0xF0, 0xE5, 0xE2, 0xEB, 0xEC,
  0xC1, 0xC6, 0xCF, 0xC8, 0xDD, 0xDA, 0xD3, 0xD4,
  0x69, 0x6E, 0x67, 0x60, 0x75, 0x72, 0x7B, 0x7C,
  0x51, 0x56, 0x5F, 0x58, 0x4D, 0x4A, 0x43, 0x44,
  0x19, 0x1E, 0x17, 0x10, 0x05, 0x02, 0x0B, 0x0C,
  0x21, 0x26, 0x2F, 0x28, 0x3D, 0x3A, 0x33, 0x34,
  0x4E, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5C, 0x5B,
  0x76, 0x71, 0x78, 0x7F, 0x6A, 0x6D, 0x64, 0x63,
  0x3E, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2C, 0x2B,
  0x06, 0x01, 0x08, 0x0F, 0x1A, 0x1D, 0x14, 0x13,
  0xAE, 0xA9, 0xA0, 0xA7, 0xB2, 0xB5, 0xBC, 0xBB,
  0x96, 0x91, 0x98, 0x9F, 0x8A, 0x8D, 0x84, 0x83,
  0xDE, 0xD9, 0xD0, 0xD7, 0xC2, 0xC5, 0xCC, 0xCB,
  0xE6, 0xE1, 0xE8, 0xEF, 0xFA, 0xFD, 0xF4, 0xF3,
]);

function calculateCRC8(data: Uint8Array): number {
  let crc = 0x00;
  for (let i = 0; i < data.length; i++) {
    crc = CRC8_TABLE[crc ^ data[i]];
  }
  return crc;
}

function coordToE7(coord: number): number {
  return Math.round(coord * 10000000);
}

function e7ToCoord(e7: number): number {
  return e7 / 10000000;
}

function isHazardMessage(type: MessageTypeValue): boolean {
  return type >= 0x10 && type <= 0x3F;
}

function hashSessionId(sessionId: number): number {
  let h = sessionId & 0xFFFFFFFF;
  h = ((h >> 16) ^ h) * 0x45D9F3B;
  h = ((h >> 16) ^ h) * 0x45D9F3B;
  h = (h >> 16) ^ h;
  return h & 0xFFFF;
}

export function encodePacketV1(input: P139PacketInput): Uint8Array {
  const buffer = new ArrayBuffer(25);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  view.setUint32(0, input.sessionId, true);
  view.setInt32(4, coordToE7(input.latitude), true);
  view.setInt32(8, coordToE7(input.longitude), true);
  
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  view.setUint32(12, timestamp, true);
  view.setUint8(16, (input.statusFlags ?? 0) & 0xFF);
  view.setUint8(17, Math.min(255, input.velocityKnots ?? 0));
  view.setUint16(18, Math.min(359, input.heading ?? 0), true);
  view.setInt16(20, input.altitudeMeters ?? 0, true);
  view.setUint16(22, input.reserved ?? 0, true);
  
  const crc = calculateCRC8(bytes.subarray(0, 24));
  view.setUint8(24, crc);
  
  return bytes;
}

export function encodePacketV2(input: P139PacketInput): Uint8Array {
  const buffer = new ArrayBuffer(25);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  const messageType = input.messageType ?? MessageType.HEARTBEAT;
  const isHazard = isHazardMessage(messageType);
  
  view.setUint8(0, (PROTOCOL_VERSION << 4) | ((messageType >> 4) & 0x0F));
  view.setUint8(1, messageType);
  view.setUint16(2, hashSessionId(input.sessionId), true);
  view.setInt32(4, coordToE7(input.latitude), true);
  view.setInt32(8, coordToE7(input.longitude), true);
  
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  view.setUint32(12, timestamp, true);
  view.setUint16(16, (input.statusFlags ?? 0) & 0xFFFF, true);
  
  if (isHazard) {
    view.setUint8(18, input.severity ?? Severity.ADVISORY);
    view.setUint16(19, input.radiusMeters ?? 0, true);
    view.setInt16(21, input.durationMinutes ?? 0, true);
  } else {
    view.setUint8(18, Math.min(255, input.velocityKnots ?? 0));
    view.setUint16(19, Math.min(359, input.heading ?? 0), true);
    view.setInt16(21, input.altitudeMeters ?? 0, true);
  }
  
  view.setUint8(23, input.reserved ?? 0);
  
  const crc = calculateCRC8(bytes.subarray(0, 24));
  view.setUint8(24, crc);
  
  return bytes;
}

/**
 * Added 9/8 BR for testing ACK
 * Builds a P139 ACK packet in response to a received hazard packet.
 * Uses the SAME 25-byte layout as every other P139 packet — no new
 * fields, no wire format change. The only thing that matters is that
 * `originalHashedSessionId` is written directly into bytes 2-3
 * WITHOUT running it through hashSessionId() again — because the
 * value you received in a decoded packet is already the 16-bit
 * hashed form. Hashing it a second time would produce a different
 * number than what the original sender is listening for, breaking
 * the ability to match the ACK back to the pending send.
 *
 * Usage: when you decode a hazard packet with StatusFlags.ACK_REQUIRED
 * set, call encodeAckPacket(decoded.sessionId) and send the resulting
 * bytes back over WHATEVER transport you received the original on
 * (UDP, LoRa, serial — this function has no transport dependency).
 */
export function encodeAckPacket(originalHashedSessionId: number, timestamp?: number): Uint8Array {
    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    view.setUint8(0, (PROTOCOL_VERSION << 4) | ((MessageType.ACK >> 4) & 0x0F));
    view.setUint8(1, MessageType.ACK);

    // Echo the received hash directly — do NOT call hashSessionId() here.
    view.setUint16(2, originalHashedSessionId & 0xFFFF, true);

    // ACK carries no location/hazard payload — zero out the rest.
    // Still occupies the same 25 bytes; nothing about the schema changes.
    view.setInt32(4, 0, true);
    view.setInt32(8, 0, true);
    view.setUint32(12, timestamp ?? Math.floor(Date.now() / 1000), true);
    view.setUint16(16, 0, true);
    view.setUint8(18, 0);
    view.setUint16(19, 0, true);
    view.setInt16(21, 0, true);
    view.setUint8(23, 0);

    const crc = calculateCRC8(bytes.subarray(0, 24));
    view.setUint8(24, crc);

    return bytes;
}

export function decodePacket(data: Uint8Array): P139Packet | null {
  if (data.length !== 25) {
    console.error('[P139] Invalid packet length:', data.length);
    return null;
  }
  
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  
  const calculatedCRC = calculateCRC8(data.subarray(0, 24));
  const receivedCRC = view.getUint8(24);
  
  if (calculatedCRC !== receivedCRC) {
    console.error('[P139] CRC mismatch:', { calculated: calculatedCRC, received: receivedCRC });
    return null;
  }
  
  const firstByte = view.getUint8(0);
  const version = firstByte >> 4;
  
  if (version === PROTOCOL_VERSION) {
    const messageType = view.getUint8(1) as MessageTypeValue;
    
    return {
      version,
      messageType,
      sessionId: view.getUint16(2, true),
      latitude: e7ToCoord(view.getInt32(4, true)),
      longitude: e7ToCoord(view.getInt32(8, true)),
      timestamp: view.getUint32(12, true),
      statusFlags: view.getUint16(16, true),
      velocityOrSeverity: view.getUint8(18),
      headingOrRadius: view.getUint16(19, true),
      altitudeOrDuration: view.getInt16(21, true),
      reserved: view.getUint8(23),
      crc8: receivedCRC,
    };
  }
  
  const statusFlags = view.getUint8(16);
  let messageType: MessageTypeValue = MessageType.HEARTBEAT;
  if (statusFlags & 0x01) messageType = MessageType.SOS;
  else if (statusFlags & 0x02) messageType = MessageType.MAN_OVERBOARD;
  else if (statusFlags & 0x08) messageType = MessageType.CRASH;
  
  return {
    version: 0x01,
    messageType,
    sessionId: view.getUint32(0, true),
    latitude: e7ToCoord(view.getInt32(4, true)),
    longitude: e7ToCoord(view.getInt32(8, true)),
    timestamp: view.getUint32(12, true),
    statusFlags,
    velocityOrSeverity: view.getUint8(17),
    headingOrRadius: view.getUint16(18, true),
    altitudeOrDuration: view.getInt16(20, true),
    reserved: view.getUint16(22, true),
    crc8: receivedCRC,
  };
}

export function encodeToBase64(input: P139PacketInput, version: 1 | 2 = 2): string {
  const bytes = version === 2 ? encodePacketV2(input) : encodePacketV1(input);
  return Buffer.from(bytes).toString('base64');
}

export function decodeFromBase64(base64: string): P139Packet | null {
  try {
    const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    return decodePacket(bytes);
  } catch (e) {
    console.error('[P139] Failed to decode Base64:', e);
    return null;
  }
}
 
