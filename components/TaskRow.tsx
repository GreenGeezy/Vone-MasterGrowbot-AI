import React, { useRef, useState } from "react";
import { CheckCircle2, Circle, Trash2 } from "lucide-react";
export default function TaskRow({
  task,
  onEdit,
  onToggle,
  onDelete,
  busy = false,
}: any) {
  const lock = useRef(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const run = async (action: () => Promise<any>) => {
    if (lock.current || busy) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      if ((await action()) === false) throw new Error();
    } catch {
      setError("Change not saved. Please try again.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  };
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          disabled={busy || working}
          aria-label={`${task.isCompleted ? "Undo" : "Mark done"}: ${
            task.title
          }`}
          aria-pressed={Boolean(task.isCompleted)}
          onClick={() => void run(() => onToggle(task.id))}
          className="min-h-11 min-w-11 flex items-center justify-center text-emerald-600 disabled:opacity-40"
        >
          {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
        </button>
        <button
          disabled={busy || working}
          onClick={() => onEdit(task)}
          className="flex-1 min-w-0 text-left py-2"
        >
          <span
            className={`block text-sm font-bold break-words ${
              task.isCompleted ? "line-through text-gray-500" : "text-gray-900"
            }`}
          >
            {task.title}
          </span>
          <span className="block text-xs text-gray-500 mt-1">
            {task.dueDate || "No date"} ·{" "}
            {task.source === "ai_diagnosis" ? "From analysis" : "Task"}
            {task.recurrence && task.recurrence !== "once"
              ? ` · ${task.recurrence}`
              : ""}
          </span>
          {task.notes && (
            <span className="block text-xs text-gray-500 line-clamp-1 mt-1">
              {task.notes}
            </span>
          )}
        </button>
        <button
          disabled={busy || working}
          aria-label={`Delete task: ${task.title}`}
          onClick={() => {
            if (window.confirm("Delete this task?"))
              void run(() => onDelete(task.id));
          }}
          className="min-h-11 min-w-11 flex items-center justify-center text-gray-400"
        >
          <Trash2 size={17} />
        </button>
      </div>
      {working && (
        <p role="status" className="text-xs text-gray-500 px-2">
          Saving…
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700 p-2">
          {error}
        </p>
      )}
    </div>
  );
}
