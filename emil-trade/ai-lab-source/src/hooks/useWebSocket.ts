import { useEffect, useRef } from 'react';
import { WS_URL } from '../api/client';
import { useStore } from '../store';
import type { WsMessage, AgentStatus } from '../types';

/**
 * Establishes a resilient WebSocket connection to the backend and wires
 * incoming events into the global store. Auto-reconnects with backoff.
 */
export function useWebSocket() {
  const setConnected = useStore((s) => s.setConnected);
  const setAgentStatus = useStore((s) => s.setAgentStatus);
  const pushPipelineStep = useStore((s) => s.pushPipelineStep);
  const setTick = useStore((s) => s.setTick);
  const pushToast = useStore((s) => s.pushToast);
  const setPipelineRunning = useStore((s) => s.setPipelineRunning);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
      };

      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      };

      ws.onmessage = (ev) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        handle(msg);
      };
    };

    const handle = (msg: WsMessage) => {
      const p = msg.payload || {};
      switch (msg.type) {
        case 'agent_progress': {
          setAgentStatus(p.agent, (p.status as AgentStatus) || 'running', p.message, p.step);
          if (p.status === 'running') setPipelineRunning(true);
          break;
        }
        case 'pipeline_step': {
          pushPipelineStep({
            step: p.step,
            agent: p.agent,
            status: p.status,
            description: p.description,
          });
          if (p.step >= 10 && p.status === 'complete') setPipelineRunning(false);
          break;
        }
        case 'strategy_update': {
          pushToast({
            type: p.status === 'REJECTED' ? 'warning' : 'success',
            message: `Strategy ${p.data?.name || p.strategy_id} → ${p.status}`,
          });
          break;
        }
        case 'position_update': {
          break;
        }
        case 'market_tick': {
          if (p.symbol) setTick(p);
          break;
        }
        case 'alert': {
          pushToast({
            type: p.type === 'critical' ? 'error' : 'info',
            message: p.message,
          });
          break;
        }
        default:
          break;
      }
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      retryRef.current = Math.min(retryRef.current + 1, 6);
      const delay = Math.min(1000 * 2 ** retryRef.current, 15000);
      setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedRef.current = true;
      try {
        wsRef.current?.close();
      } catch {
        /* noop */
      }
    };
  }, [setConnected, setAgentStatus, pushPipelineStep, setTick, pushToast, setPipelineRunning]);

  return wsRef;
}
