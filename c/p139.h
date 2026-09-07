#ifndef P139_H
#define P139_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#define P139_PACKET_SIZE 25
#define P139_PROTOCOL_VERSION 0x02

typedef struct {
    uint8_t message_type;
    uint32_t session_id;
    double latitude;
    double longitude;
    uint32_t timestamp;
    uint16_t status_flags;
    uint8_t velocity_or_severity;
    uint16_t heading_or_radius;
    int16_t altitude_or_duration;
    uint8_t reserved;
    uint8_t crc8;
} p139_packet_t;

int p139_encode_v2(const p139_packet_t *input, uint8_t *out_buffer);
bool p139_decode(const uint8_t *buffer, size_t length, p139_packet_t *out_packet);

#endif
