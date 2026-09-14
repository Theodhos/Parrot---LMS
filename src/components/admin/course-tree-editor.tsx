"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleCard } from "@/components/admin/module-card";
import { ModuleFormDialog } from "@/components/admin/module-form-dialog";
import type { ModuleRecord } from "@/features/modules/actions/module.actions";
import type { ModuleOutlineDTO } from "@/features/courses/types/course.types";

export interface CourseTreeEditorProps {
  courseId: string;
  initialModules: ModuleOutlineDTO[];
}

export function CourseTreeEditor({ courseId, initialModules }: CourseTreeEditorProps) {
  const [modules, setModules] = useState<ModuleOutlineDTO[]>(initialModules);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialModules[0] ? [initialModules[0].id] : []),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleOutlineDTO | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const previous = modules;
    const reordered = arrayMove(modules, oldIndex, newIndex);
    setModules(reordered);

    const res = await fetch(`/api/courses/${courseId}/modules/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedModuleIds: reordered.map((m) => m.id) }),
    });
    const json = (await res.json()) as { success: boolean };
    if (!json.success) {
      toast.error("Failed to reorder modules.");
      setModules(previous);
    }
  }

  function handleModuleCreated(module: ModuleRecord) {
    setModules((prev) => [
      ...prev,
      { id: module.id, title: module.title, description: module.description, order: module.order, lessons: [] },
    ]);
    setExpanded((prev) => new Set(prev).add(module.id));
  }

  function handleModuleUpdated(module: ModuleRecord) {
    setModules((prev) =>
      prev.map((m) => (m.id === module.id ? { ...m, title: module.title, description: module.description } : m)),
    );
  }

  function handleModuleDeleted(moduleId: string) {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modules &amp; lessons</CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus />
          New module
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {modules.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
            No modules yet. Add your first module to start building this course.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {modules.map((mod, index) => (
                  <ModuleCard
                    key={mod.id}
                    courseId={courseId}
                    module={mod}
                    index={index}
                    expanded={expanded.has(mod.id)}
                    onToggleExpanded={() => toggleExpanded(mod.id)}
                    onEdit={() => setEditingModule(mod)}
                    onDeleted={() => handleModuleDeleted(mod.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <ModuleFormDialog
        courseId={courseId}
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={handleModuleCreated}
      />

      {editingModule && (
        <ModuleFormDialog
          key={editingModule.id}
          courseId={courseId}
          mode="edit"
          initialModule={{
            id: editingModule.id,
            title: editingModule.title,
            description: editingModule.description,
            order: editingModule.order,
            courseId,
          }}
          open
          onOpenChange={(next) => !next && setEditingModule(null)}
          onSaved={handleModuleUpdated}
        />
      )}
    </Card>
  );
}
