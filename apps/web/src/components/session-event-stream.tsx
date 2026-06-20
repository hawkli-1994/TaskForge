"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SessionEvent } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { SessionEventItem } from "./session-event";

export function SessionEventStream({
  sessionId,
  initialEvents,
}: {
  sessionId: string;
  initialEvents: SessionEvent[];
}) {
  const [events, setEvents] = useState<SessionEvent[]>(initialEvents);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastSeq =
      events.length > 0 ? Math.max(...events.map((e) => e.seq)) : 0;
    const es = new EventSource(
      `/api/sessions/${sessionId}/events/stream?afterSeq=${lastSeq}`,
    );

    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data) as SessionEvent;
        setEvents((prev) => {
          if (prev.some((e) => e.seq === evt.seq)) return prev;
          return [...prev, evt];
        });
      } catch {
        // ignore malformed events
      }
    };

    return () => es.close();
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;
    setSending(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/events`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  }

  async function handleStop() {
    setStopping(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/stop`, { method: "POST" });
    } finally {
      setStopping(false);
    }
  }

  return (
    <div>
      <div
        ref={scrollRef}
        className="h-96 overflow-y-auto rounded-md bg-black p-4 font-mono text-sm text-green-400"
      >
        {events.length === 0 ? (
          <div className="text-gray-500">No events yet.</div>
        ) : (
          events.map((evt) => <SessionEventItem key={evt.seq} event={evt} />)
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Send human input..."
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>

      <button
        onClick={handleStop}
        disabled={stopping}
        className="mt-3 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {stopping ? "Stopping..." : "Stop Session"}
      </button>
    </div>
  );
}
