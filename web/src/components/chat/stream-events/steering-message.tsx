"use client";

<<<<<<< HEAD
import { MessageSquare } from "lucide-react";
=======
import { Navigation } from "lucide-react";
>>>>>>> feat/spec-tree-plan
import type { SteeringReceivedData } from "@/types/stream-events";

interface SteeringMessageProps {
  data: SteeringReceivedData;
}

/**
<<<<<<< HEAD
 * Renders a user message sent while the agent is running.
 * Displayed as a compact right-aligned bubble (similar to a regular user message).
=======
 * Renders a steering message injected by the user during agent execution.
 * Displayed as a compact right-aligned bubble with a steering icon.
>>>>>>> feat/spec-tree-plan
 */
export function SteeringMessage({ data }: SteeringMessageProps) {
  return (
    <div className="flex justify-end my-2">
      <div className="inline-flex items-start gap-2 max-w-[80%] rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2 text-sm">
<<<<<<< HEAD
        <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-foreground">{data.message}</p>
=======
        <Navigation className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Steering</span>
          <p className="text-foreground mt-0.5">{data.message}</p>
        </div>
>>>>>>> feat/spec-tree-plan
      </div>
    </div>
  );
}
