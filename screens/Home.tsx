import React, { useState } from "react";
import ProCheckIn from '../components/ProCheckIn';
import {proFirstRelease} from '../services/releaseFeatures';
import PlantCard from "../components/PlantCard";
import Growbot from "../components/Growbot";
import TaskRow from "../components/TaskRow";
import TaskEditor from "../components/TaskEditor";
import { localDate } from "../services/taskRequest";
export default function Home({
  plants = [],
  tasks = [],
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onDeletePlant,
  onNavigateToPlant,
  onAddPlant,
  onOpenJournal,
  onCheckPhoto,
  busyActions = [],
}: any) {
  const [editing, setEditing] = useState<any>(null);
  const [showDone, setShowDone] = useState(false);
  const today = localDate();
  const pending = tasks
    .filter((t: any) => !t.isCompleted && (!t.dueDate || t.dueDate <= today))
    .sort((a: any, b: any) =>
      String(a.dueDate).localeCompare(String(b.dueDate))
    );
  const done = tasks.filter((t: any) => t.isCompleted);
  const upcoming = tasks.filter(
    (t: any) => !t.isCompleted && t.dueDate > today
  ).length;
  const row = (task: any) => (
    <TaskRow
      key={task.id}
      task={task}
      onEdit={setEditing}
      onToggle={onToggleTask}
      onDelete={onDeleteTask}
      busy={busyActions.includes(`task:${task.id}`)}
    />
  );
  return (
    <div className="grow-dashboard pb-32 px-5 pt-[max(3rem,env(safe-area-inset-top))] min-h-screen bg-surface">
      <div className="dashboard-hero flex items-center gap-4 mb-5">
        <Growbot size="md" mood={pending.length ? "neutral" : "happy"} />
        <div>
          <h1 className="text-2xl font-black">Your grow overview</h1>
          <p className="text-sm text-gray-600">
            {pending.length
              ? `${pending.length} tasks ready for you`
              : "No tasks due today"}
          </p>
        </div>
      </div>
      <nav className="grow-overview" aria-label="Grow overview">
        <button onClick={plants.length ? onOpenJournal : onAddPlant}><strong>{plants.length}</strong><span>Plants</span></button>
        <button onClick={onOpenJournal}><strong>{pending.length}</strong><span>Tasks due</span></button>
        <button onClick={onOpenJournal}><strong>{plants.reduce((count: number, plant: any) => count + (plant.journal?.length || 0), 0)}</strong><span>Check-ins</span></button>
      </nav>
      {proFirstRelease && <ProCheckIn plants={plants} onAddPlant={onAddPlant} onOpenJournal={onOpenJournal} onNavigateToPlant={onNavigateToPlant} />}
      {proFirstRelease && onCheckPhoto && <button onClick={onCheckPhoto} className="journey-primary mb-5">Check a plant photo</button>}
      <h2 className="font-bold text-lg mb-3">Today’s tasks</h2>
      <div className="space-y-3">{pending.map(row)}</div>
      {!pending.length && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100">
          <h2 className="font-bold">You're caught up</h2>
          <p className="text-sm text-gray-600 mt-1">
            {upcoming
              ? `${upcoming} upcoming tasks in Journal.`
              : "Capture what changed today with a note, or plan your next task in Journal."}
          </p>
        </div>
      )}
      {done.length > 0 && (
        <div className="mt-4">
          <button
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="min-h-11 text-sm font-bold text-gray-600"
          >
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && <div className="space-y-3">{done.map(row)}</div>}
        </div>
      )}
      <div className="mt-7">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Your plants</h2>
          <button
            onClick={onAddPlant}
            className="min-h-11 px-4 rounded-xl bg-gray-100 text-sm font-bold"
          >
            Add plant
          </button>
        </div>
        {plants.length === 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Add your first plant to keep its notes and photos together.
          </p>
        )}
        <div className="space-y-4">
          {plants.map((plant: any) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onClick={() => onNavigateToPlant(plant.id)}
              onDelete={() => onDeletePlant(plant.id)}
            />
          ))}
        </div>
      </div>
      {editing && (
        <TaskEditor
          task={editing}
          onClose={() => setEditing(null)}
          onSave={(
            title: string,
            notes: string,
            repeat: string,
            date: string
          ) => onEditTask(editing.id, title, notes, repeat, date)}
        />
      )}
    </div>
  );
}
