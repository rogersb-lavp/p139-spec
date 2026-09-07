pub const PROTOCOL_VERSION: u8 = 0x02;
pub const PACKET_SIZE: usize = 25;

const CRC8_TABLE: [u8; 256] = [
    0x00, 0x07, 0x0E, 0x09, 0x1C, 0x1B, 0x12, 0x15, 0x38, 0x3F, 0x36, 0x31, 0x24, 0x23, 0x2A, 0x2D,
    0x70, 0x77, 0x7E, 0x79, 0x6C, 0x6B, 0x62, 0x65, 0x48, 0x4F, 0x46, 0x41, 0x54, 0x53, 0x5A, 0x5D,
    0xE0, 0xE7, 0xEE, 0xE9, 0xFC, 0xFB, 0xF2, 0xF5, 0xD8, 0xDF, 0xD6, 0xD1, 0xC4, 0xC3, 0xCA, 0xCD,
    0x90, 0x97, 0x9E, 0x99, 0x8C, 0x8B, 0x82, 0x85, 0xA8, 0xAF, 0xA6, 0xA1, 0xB4, 0xB3, 0xBA, 0xBD,
    0xC7, 0xC0, 0xC9, 0xCE, 0xDB, 0xDC, 0xD5, 0xD2, 0xFF, 0xF8, 0xF1, 0xF6, 0xE3, 0xE4, 0xED, 0xEA,
    0xB7, 0xB0, 0xB9, 0xBE, 0xAB, 0xAC, 0xA5, 0xA2, 0x8F, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9D, 0x9A,
    0x27, 0x20, 0x29, 0x2E, 0x3B, 0x3C, 0x35, 0x32, 0x1F, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0D, 0x0A,
    0x57, 0x50, 0x59, 0x5E, 0x4B, 0x4C, 0x45, 0x42, 0x6F, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7D, 0x7A,
    0x89, 0x8E, 0x87, 0x80, 0x95, 0x92, 0x9B, 0x9C, 0xB1, 0xB6, 0xBF, 0xB8, 0xAD, 0xAA, 0xA3, 0xA4,
    0xF9, 0xFE, 0xF7, 0xF0, 0xE5, 0xE2, 0xEB, 0xEC, 0xC1, 0xC6, 0xCF, 0xC8, 0xDD, 0xDA, 0xD3, 0xD4,
    0x69, 0x6E, 0x67, 0x60, 0x75, 0x72, 0x7B, 0x7C, 0x51, 0x56, 0x5F, 0x58, 0x4D, 0x4A, 0x43, 0x44,
    0x19, 0x1E, 0x17, 0x10, 0x05, 0x02, 0x0B, 0x0C, 0x21, 0x26, 0x2F, 0x28, 0x3D, 0x3A, 0x33, 0x34,
    0x4E, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5C, 0x5B, 0x76, 0x71, 0x78, 0x7F, 0x6A, 0x6D, 0x64, 0x63,
    0x3E, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2C, 0x2B,
    0x06, 0x01, 0x08, 0x0F, 0x1A, 0x1D, 0x14, 0x13,
    0xAE, 0xA9, 0xA0, 0xA7, 0xB2, 0xB5, 0xBC, 0xBB,
    0x96, 0x91, 0x98, 0x9F, 0x8A, 0x8D, 0x84, 0x83,
    0xDE, 0xD9, 0xD0, 0xD7, 0xC2, 0xC5, 0xCC, 0xCB,
    0xE6, 0xE1, 0xE8, 0xEF, 0xFA, 0xFD, 0xF4, 0xF3
];

fn calculate_crc8(data: &[u8]) -> u8 {
    let mut crc = 0x00;
    for &b in data {
        crc = CRC8_TABLE[(crc ^ b) as usize];
    }
    crc
}

fn hash_session_id(session_id: u32) -> u16 {
    let mut h = session_id;
    h = ((h >> 16) ^ h).wrapping_mul(0x45D9F3B);
    h = ((h >> 16) ^ h).wrapping_mul(0x45D9F3B);
    h = (h >> 16) ^ h;
    (h & 0xFFFF) as u16
}

#[derive(Debug, Clone)]
pub struct P139Packet {
    pub version: u8,
    pub message_type: u8,
    pub session_id: u16,
    pub latitude: f64,
    pub longitude: f64,
    pub timestamp: u32,
    pub status_flags: u16,
    pub velocity_or_severity: u8,
    pub heading_or_radius: u16,
    pub altitude_or_duration: i16,
    pub reserved: u8,
    pub crc8: u8,
}

pub struct P139Input {
    pub message_type: u8,
    pub session_id: u32,
    pub latitude: f64,
    pub longitude: f64,
    pub timestamp: Option<u32>,
    pub status_flags: Option<u16>,
    pub velocity_or_severity: Option<u8>,
    pub heading_or_radius: Option<u16>,
    pub altitude_or_duration: Option<i16>,
    pub reserved: Option<u8>,
}

pub fn encode_packet_v2(input: &P139Input) -> [u8; PACKET_SIZE] {
    let mut buf = [0u8; PACKET_SIZE];
    
    buf[0] = (PROTOCOL_VERSION << 4) | ((input.message_type >> 4) & 0x0F);
    buf[1] = input.message_type;
    
    let hashed_session = hash_session_id(input.session_id);
    buf[2..4].copy_from_slice(&hashed_session.to_le_bytes());
    
    let lat_e7 = (input.latitude * 10_000_000.0).round() as i32;
    let lon_e7 = (input.longitude * 10_000_000.0).round() as i32;
    buf[4..8].copy_from_slice(&lat_e7.to_le_bytes());
    buf[8..12].copy_from_slice(&lon_e7.to_le_bytes());
    
    let ts = input.timestamp.unwrap_or_else(|| {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as u32
    });
    buf[12..16].copy_from_slice(&ts.to_le_bytes());
    
    let flags = input.status_flags.unwrap_or(0);
    buf[16..18].copy_from_slice(&flags.to_le_bytes());
    
    buf[18] = input.velocity_or_severity.unwrap_or(0);
    
    let horiz = input.heading_or_radius.unwrap_or(0);
    buf[19..21].copy_from_slice(&horiz.to_le_bytes());
    
    let alt = input.altitude_or_duration.unwrap_or(0);
    buf[21..23].copy_from_slice(&alt.to_le_bytes());
    
    buf[23] = input.reserved.unwrap_or(0);
    buf[24] = calculate_crc8(&buf[0..24]);
    
    buf
}

pub fn decode_packet(data: &[u8]) -> Option<P139Packet> {
    if data.len() != PACKET_SIZE {
        return None;
    }
    
    let expected_crc = calculate_crc8(&data[0..24]);
    if expected_crc != data[24] {
        return None;
    }
    
    let version = data[0] >> 4;
    if version != PROTOCOL_VERSION {
        return None;
    }
    
    let message_type = data[1];
    let session_id = u16::from_le_bytes([data[2], data[3]]);
    
    let lat_e7 = i32::from_le_bytes([data[4], data[5], data[6], data[7]]);
    let lon_e7 = i32::from_le_bytes([data[8], data[9], data[10], data[11]]);
    
    Some(P139Packet {
        version,
        message_type,
        session_id,
        latitude: lat_e7 as f64 / 10_000_000.0,
        longitude: lon_e7 as f64 / 10_000_000.0,
        timestamp: u32::from_le_bytes([data[12], data[13], data[14], data[15]]),
        status_flags: u16::from_le_bytes([data[16], data[17]]),
        velocity_or_severity: data[18],
        heading_or_radius: u16::from_le_bytes([data[19], data[20]]),
        altitude_or_duration: i16::from_le_bytes([data[21], data[22]]),
        reserved: data[23],
        crc8: data[24],
    })
}
