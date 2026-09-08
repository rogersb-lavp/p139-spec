/**
 * P139 Protocol API Routes (Open Standard)
 * 
 * Reference Express HTTP gateway for encoding and decoding 
 * P139 25-byte hazard frames over a REST interface.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  encodeToBase64, 
  decodeFromBase64,
  MessageType,
  Severity,
  StatusFlags
} from './encoder';

const router = Router();

const validSeverities = Object.values(Severity);

const encodeRequestSchema = z.object({
  messageType: z.string().optional(),
  sessionId: z.number().min(0).max(4294967295), // 32-bit max before hashing
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.number().optional(),
  
  // Status flags act as a 16-bit bitmask in V2
  statusFlags: z.number().min(0).max(0xFFFF).optional(), 
  
  velocityKnots: z.number().min(0).max(255).optional(),
  heading: z.number().min(0).max(359).optional(),
  altitudeMeters: z.number().optional(),
  
  // Strictly validate against the canonical Severity object values
  severity: z.number().refine(val => validSeverities.includes(val as any), {
    message: `Invalid severity level. Must be one of: ${validSeverities.join(', ')}`
  }).optional(),
  
  radiusMeters: z.number().min(0).max(65535).optional(), // 16-bit uint
  durationMinutes: z.number().min(-32768).max(32767).optional(), // 16-bit int
  reserved: z.number().min(0).max(255).optional(),
  version: z.enum(['1', '2']).optional().default('2'),
});

const MESSAGE_TYPE_MAP: Record<string, number> = {
  SOS: MessageType.SOS,
  MAN_OVERBOARD: MessageType.MAN_OVERBOARD,
  CRASH: MessageType.CRASH,
  MEDICAL: MessageType.MEDICAL,
  FLOOD: MessageType.FLOOD,
  FIRE: MessageType.FIRE,
  AVALANCHE: MessageType.AVALANCHE,
  WEATHER: MessageType.WEATHER,
  DAM: MessageType.DAM,
  HAZMAT: MessageType.HAZMAT,
  STRUCTURE: MessageType.STRUCTURE,
  ICE: MessageType.ICE,
  VOLCANIC: MessageType.VOLCANIC,
  WILDLIFE: MessageType.WILDLIFE,
  CIVIL: MessageType.CIVIL,
  RESPONDING: MessageType.RESPONDING,
  ACK: MessageType.ACK,
  CANCEL: MessageType.CANCEL,
  HEARTBEAT: MessageType.HEARTBEAT,
  ALL_CLEAR: MessageType.ALL_CLEAR,
  ESCALATE: MessageType.ESCALATE,
};

router.post('/encode', async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = encodeRequestSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.errors 
      });
    }
    
    const data = parsed.data;
    const messageTypeValue = data.messageType 
      ? MESSAGE_TYPE_MAP[data.messageType] ?? MessageType.HEARTBEAT
      : MessageType.HEARTBEAT;
    
    const input = {
      messageType: messageTypeValue as any,
      sessionId: data.sessionId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
      statusFlags: data.statusFlags,
      velocityKnots: data.velocityKnots,
      heading: data.heading,
      altitudeMeters: data.altitudeMeters,
      severity: data.severity,
      radiusMeters: data.radiusMeters,
      durationMinutes: data.durationMinutes,
      reserved: data.reserved,
    };
    
    const version = data.version === '1' ? 1 : 2;
    const base64 = encodeToBase64(input, version);
    
    return res.json({
      base64,
      byteLength: 25,
      version,
    });
  } catch (error) {
    console.error('[P139 API] Encode error:', error);
    return res.status(500).json({ error: 'Encoding failed' });
  }
});

router.post('/decode', async (req: Request, res: Response): Promise<any> => {
  try {
    const { base64 } = req.body;
    
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'Missing base64 data' });
    }
    
    const packet = decodeFromBase64(base64);
    
    if (!packet) {
      return res.status(400).json({ error: 'Invalid packet or CRC mismatch' });
    }
    
    return res.json({
      packet,
      valid: true,
    });
  } catch (error) {
    console.error('[P139 API] Decode error:', error);
    return res.status(500).json({ error: 'Decoding failed' });
  }
});

router.get('/message-types', (_req: Request, res: Response) => {
  return res.json({
    types: Object.keys(MESSAGE_TYPE_MAP),
    severities: Object.keys(Severity),
    statusFlags: Object.keys(StatusFlags),
  });
});

// Provides server time for strict P139 wire synchronization
router.get('/status', (_req: Request, res: Response) => {
  return res.json({ 
    status: 'online',
    serverTime: Date.now(),
    serverTimeISO: new Date().toISOString(),
  });
});

export default router;
 
