import { SessionEvent } from "@/lib/types";

export function SessionEventItem({ event }: { event: SessionEvent }) {
  return (
    <div className="py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500">[{event.seq}]</span>{" "}
      <span className="text-yellow-400">{event.type}</span>{" "}
      <span className="text-green-300">
        {JSON.stringify(event.payload)}
      </span>
    </div>
  );
}
