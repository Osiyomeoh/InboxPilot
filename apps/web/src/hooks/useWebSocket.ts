'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsEvent {
  type: string;
  payload: unknown;
}

export function useWebSocket(onEvent: (e: WsEvent) => void) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001';
    const socket = new WebSocket(`${url}/ws`);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000); // reconnect
    };
    socket.onerror = () => socket.close();
    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WsEvent;
        onEventRef.current(event);
      } catch {}
    };

    ws.current = socket;
  }, []);

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, [connect]);

  return { connected };
}
