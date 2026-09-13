import React, { useEffect, useState } from "react";
import NoteCreator from "../components/NoteCreator";
import TaskRow from "../components/TaskRow";
import TaskEditor from "../components/TaskEditor";
import { analyzeGrowLog } from "../services/geminiService";
import { withTimeout } from "../services/appInitializer";
const summary = (entry: any) =>
  typeof entry.aiAnalysis?.summary === "string" ? entry.aiAnalysis.summary : "";
export default function Journal({
  plants = [],
  tasks = [],
  onAddEntry,
  onAddTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
  onDeleteEntry,
  busyActions = [],
  initialPlantId,
}: any) {
  const [plantId, setPlantId] = useState(initialPlantId || plants[0]?.id);
  const plant = plants.find((p: any) => p.id === plantId) || plants[0];
  const [creator, setCreator] = useState(false);
  const [taskEditor, setTaskEditor] = useState<any>(null);
  const [entry, setEntry] = useState<any>(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (initialPlantId) setPlantId(initialPlantId);
  }, [initialPlantId]);
  const entries = (plant?.journal || []).map((j: any) => ({
    ...j,
    feedType: "note",
  }));
  const scopedTasks = tasks
    .filter(
      (t: any) =>
        !plant?.id ||
        !(t.plantId || t.plant_id) ||
        String(t.plantId || t.plant_id) === String(plant.id)
    )
    .map((t: any) => ({ ...t, date: t.dueDate, feedType: "task" }));
  const feed = [...entries, ...scopedTasks]
    .filter(
      (i) =>
        filter === "All" ||
        (filter === "Notes" ? i.feedType === "note" : i.feedType === "task")
    )
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const saveNote = async (note: any) => {
    if (!plant?.id) throw new Error("Select a plant first");
    let aiAnalysis;
    try {
      if (note.notes?.trim()) {
        const result = await withTimeout(
          analyzeGrowLog(note.notes),
          8000,
          "Note insight"
        );
        if (result) aiAnalysis = { summary: result };
      }
    } catch {
      /* A note can be saved without an optional insight. */
    }
    const saved = await onAddEntry(
      {
        ...note,
        imageUri: note.image || note.imageUri,
        plantId: plant.id,
        ...(aiAnalysis ? { aiAnalysis } : {}),
      },
      plant.id
    );
    if (saved === false) throw new Error("Note was not saved");
    setCreator(false);
  };
  return (
    <div className="bg-surface min-h-screen pb-32 pt-[max(3rem,env(safe-area-inset-top))] px-5">
      <h1 className="text-2xl font-black">Journal</h1>
      <p className="text-sm text-gray-600 mt-1 mb-4">
        Notes remember what happened. Tasks plan what comes next.
      </p>
      {plants.length > 0 ? (
        <label className="block text-xs font-bold text-gray-600 mb-4">
          Saving notes to
          <select
            aria-label="Journal plant"
            value={plant?.id || ""}
            onChange={(e) => setPlantId(e.target.value)}
            className="block w-full bg-white border border-gray-200 rounded-xl p-3 mt-1 text-sm text-gray-900"
          >
            {plants.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name || p.strain || "Plant"}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl mb-4">
          Add a plant from Home to start saving notes. You can add tasks now.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          disabled={!plant?.id}
          onClick={() => setCreator(true)}
          className="min-h-12 rounded-xl bg-emerald-600 text-white py-3 font-bold disabled:opacity-40"
        >
          Add note
        </button>
        <button
          onClick={() => setTaskEditor({})}
          className="min-h-12 rounded-xl bg-white border border-gray-200 py-3 font-bold"
        >
          Add task
        </button>
      </div>
      <div className="flex gap-2 mb-4" aria-label="Journal filters">
        {["All", "Notes", "Tasks"].map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${
              filter === f ? "bg-gray-900 text-white" : "bg-white text-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {entries.length} saved notes ·{" "}
        {scopedTasks.filter((t: any) => !t.isCompleted).length} open tasks
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700 mb-3">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {feed.map((item) =>
          item.feedType === "task" ? (
            <TaskRow
              key={`task:${item.id}`}
              task={item}
              onEdit={setTaskEditor}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              busy={busyActions.includes(`task:${item.id}`)}
            />
          ) : (
            <button
              key={`note:${item.id}`}
              onClick={() => {
                setError("");
                setEntry(item);
              }}
              className="block w-full text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between gap-3 text-xs text-gray-500 mb-2">
                <span>{item.date}</span>
                <span>
                  {item.type === "diagnosis"
                    ? "Health Check"
                    : item.type || "Note"}
                </span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3 break-words">
                {item.notes || "Photo note"}
              </p>
              {(item.image || item.imageUri) && (
                <img
                  src={item.image || item.imageUri}
                  alt="Journal attachment"
                  className="mt-3 w-full h-36 object-cover rounded-xl"
                  loading="lazy"
                />
              )}
              {summary(item) && (
                <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl mt-3 line-clamp-3">
                  {summary(item)}
                </p>
              )}
              <span className="block text-xs text-emerald-700 font-bold mt-3">
                Open note
              </span>
            </button>
          )
        )}
      </div>
      {!feed.length && (
        <div className="rounded-2xl bg-white p-6 text-center">
          <h2 className="font-bold">
            {filter === "Tasks" ? "Plan your next step" : "Start your record"}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {filter === "Tasks"
              ? "Add a task with a date and mark it done here or on Home."
              : "A quick note or photo today gives you something to compare next time."}
          </p>
        </div>
      )}
      {creator && (
        <NoteCreator onSave={saveNote} onClose={() => setCreator(false)} />
      )}
      {taskEditor && (
        <TaskEditor
          task={taskEditor.id ? taskEditor : null}
          onClose={() => setTaskEditor(null)}
          onSave={(
            title: string,
            notes: string,
            repeat: string,
            date: string
          ) =>
            taskEditor.id
              ? onEditTask(taskEditor.id, title, notes, repeat, date)
              : onAddTask(title, date, "user", {
                  notes,
                  recurrence: repeat,
                  plantId: plant?.id,
                })
          }
        />
      )}
      {entry && (
        <div className="fixed inset-0 z-[80] bg-black/50 p-4 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Journal note"
            className="bg-white rounded-3xl w-full max-w-lg max-h-[85dvh] flex flex-col"
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">
                {entry.type || "Note"} · {entry.date}
              </h2>
              <button
                onClick={() => setEntry(null)}
                className="min-h-11 px-3 font-bold"
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {entry.notes}
              </p>
              {(entry.image || entry.imageUri) && (
                <img
                  src={entry.image || entry.imageUri}
                  alt="Journal attachment"
                  className="rounded-xl w-full mt-4"
                />
              )}
              {summary(entry) && (
                <p className="whitespace-pre-wrap text-sm bg-emerald-50 p-4 rounded-xl mt-4">
                  {summary(entry)}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-700 mt-3">
                  {error}
                </p>
              )}
            </div>
            <button
              disabled={deleting}
              onClick={async () => {
                if (!window.confirm("Delete this note?")) return;
                setDeleting(true);
                try {
                  if ((await onDeleteEntry(entry.id, plant?.id)) === false)
                    throw new Error();
                  setEntry(null);
                } catch {
                  setError("Could not delete the note. Please try again.");
                } finally {
                  setDeleting(false);
                }
              }}
              className="min-h-12 py-3 text-red-600 border-t font-bold"
            >
              {deleting ? "Deleting…" : "Delete note"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
