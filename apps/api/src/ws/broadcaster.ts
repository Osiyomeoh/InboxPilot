// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsClient = any;

const clients = new Set<WsClient>();

export function registerClient(ws: WsClient) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
}

export function broadcast(event: { type: string; payload: unknown }) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    // @fastify/websocket wraps the raw ws in a SocketStream — use .socket for the raw WebSocket
    const raw = client.socket ?? client;
    if (raw.readyState === 1) {
      raw.send(message);
    }
  }
}

export function clientCount() {
  return clients.size;
}
