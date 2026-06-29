import type { WebSocket } from '@fastify/websocket';

const clients = new Set<WebSocket>();

export function registerClient(ws: WebSocket) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcast(event: { type: string; payload: unknown }) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  }
}

export function clientCount() {
  return clients.size;
}
