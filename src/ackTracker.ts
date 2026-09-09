/**
 * P139 ACK Tracker (transport-agnostic)
 *
 * Handles retry/timeout logic for hazard packets that require
 * acknowledgment (StatusFlags.ACK_REQUIRED). This module has NO idea
 * what transport is being used — UDP, LoRa radio, serial, carrier
 * pigeon — it just calls whatever `sendFn` you give it. That keeps
 * the retry/reliability logic completely separate from any specific
 * network technology, matching the "transport agnostic" requirement.
 *
 * Usage on the SENDING side:
 *
 *   const tracker = createAckTracker((bytes) => {
 *     // however you actually transmit — e.g. udpSocket.send(bytes, ...)
 *     // or loraModule.transmit(bytes)
 *   }, { timeoutMs: 5000, maxRetries: 3 });
 *
 *   const hashedId = getHashedSessionId(rawSessionId); // see note below
 *   tracker.sendWithAck(hashedId, packetBytes, () => {
 *     console.warn('Never got ACK after max retries — giving up');
 *   });
 *
 * Usage on the RECEIVING side (whenever you decode an incoming packet):
 *
 *   if (decoded.messageType === MessageType.ACK) {
 *     tracker.onAckReceived(decoded.sessionId);
 *   }
 */

export interface AckTrackerOptions {
    timeoutMs?: number;   // how long to wait for an ACK before retrying (default 5000ms)
    maxRetries?: number;  // how many total attempts before giving up (default 3)
}

interface PendingEntry {
    bytes: Uint8Array;
    attempts: number;
    timer: ReturnType<typeof setTimeout>;
    onFailure?: () => void;
}

export function createAckTracker(
    sendFn: (bytes: Uint8Array) => void,
    options: AckTrackerOptions = {}
) {
    const timeoutMs = options.timeoutMs ?? 5000;
    const maxRetries = options.maxRetries ?? 3;
    const pending = new Map<number, PendingEntry>();

    function attempt(hashedSessionId: number, bytes: Uint8Array, attemptNumber: number, onFailure?: () => void) {
        sendFn(bytes);

        const timer = setTimeout(() => {
            if (attemptNumber >= maxRetries) {
                pending.delete(hashedSessionId);
                onFailure?.();
            } else {
                attempt(hashedSessionId, bytes, attemptNumber + 1, onFailure);
            }
        }, timeoutMs);

        pending.set(hashedSessionId, { bytes, attempts: attemptNumber, timer, onFailure });
    }

    /**
     * Send a packet that requires acknowledgment. Automatically retries
     * up to maxRetries times if no ACK arrives within timeoutMs each time.
     * Calls onFailure() if all retries are exhausted with no ACK.
     */
    function sendWithAck(hashedSessionId: number, bytes: Uint8Array, onFailure?: () => void) {
        attempt(hashedSessionId, bytes, 1, onFailure);
    }

    /**
     * Call this whenever you decode an incoming ACK packet
     * (messageType === MessageType.ACK). Cancels any pending
     * retries for that session.
     */
    function onAckReceived(hashedSessionId: number) {
        const entry = pending.get(hashedSessionId);
        if (entry) {
            clearTimeout(entry.timer);
            pending.delete(hashedSessionId);
        }
    }

    /** Cancels all pending retries — call this on shutdown. */
    function stopAll() {
        for (const entry of pending.values()) {
            clearTimeout(entry.timer);
        }
        pending.clear();
    }

    return { sendWithAck, onAckReceived, stopAll };
}
