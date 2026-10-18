import React, { useRef, useState } from "react";
import { localDate } from "../services/taskRequest";
export default function TaskEditor({ task, onSave, onClose }: any) {
  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");
  const [date, setDate] = useState(task?.dueDate?.slice(0, 10) || localDate());
  const [repeat, setRepeat] = useState(task?.recurrence || "once");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current || !title.trim() || !date) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if ((await onSave(title.trim(), notes.trim(), repeat, date)) === false)
        throw new Error();
      onClose();
    } catch {
      setError("Could not save. Your draft is still here. Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={task ? "Edit task" : "New task"}
        onSubmit={save}
        className="bg-white w-full max-w-sm rounded-3xl p-6 max-h-[85dvh] overflow-y-auto"
      >
        <h2 className="text-xl font-black mb-4">
          {task ? "Edit task" : "New task"}
        </h2>
        <label className="block text-sm font-bold">
          Task
          <input
            required
            maxLength={500}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full p-3 rounded-xl bg-gray-50 mt-1 mb-3"
          />
        </label>
        <label className="block text-sm font-bold">
          Due date
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block w-full min-w-0 p-3 rounded-xl bg-gray-50 mt-1 mb-3"
          />
        </label>
        <label className="block text-sm font-bold">
          Repeat label
          <select
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            className="block w-full p-3 rounded-xl bg-gray-50 mt-1"
          >
            <option value="once">One time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Labels do not create reminders or repeat tasks automatically.
        </p>
        <label className="block text-sm font-bold">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full p-3 rounded-xl bg-gray-50 mt-1 mb-3"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700 mb-3">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 rounded-xl font-bold"
          >
            Cancel
          </button>
          <button
            disabled={busy || !title.trim() || !date}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </div>
  );
}
