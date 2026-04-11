'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Module {
  id: string;
  title: string;
  type: string;
  content: string;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  badgeIcon: string;
  modules: Module[];
  status: string;
  progress: number;
  completedModules: string[];
}

// Format **bold** to <strong> — content is authored by us, not user-generated
function formatBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function RichText({ content }: { content: string }) {
  const paragraphs = content.split('\n\n');

  return (
    <div className="prose prose-sm max-w-none text-text">
      {paragraphs.map((paragraph, i) => {
        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
          return <h3 key={i} className="text-base font-bold text-text mt-6 mb-2">{paragraph.slice(2, -2)}</h3>;
        }
        if (paragraph.includes('\n- ')) {
          const lines = paragraph.split('\n');
          const title = lines[0];
          const items = lines.slice(1).filter(l => l.startsWith('- '));
          return (
            <div key={i} className="mb-4">
              {title && <p className="font-semibold text-text mb-1">{renderInline(title)}</p>}
              <ul className="list-disc pl-5 space-y-1">
                {items.map((item, j) => (
                  <li key={j} className="text-sm text-text/80">{renderInline(item.slice(2))}</li>
                ))}
              </ul>
            </div>
          );
        }
        if (/^\d+\./.test(paragraph.trim())) {
          const items = paragraph.split('\n').filter(l => l.trim());
          return (
            <ol key={i} className="list-decimal pl-5 space-y-1 mb-4">
              {items.map((item, j) => (
                <li key={j} className="text-sm text-text/80">{renderInline(item.replace(/^\d+\.\s*/, ''))}</li>
              ))}
            </ol>
          );
        }
        return <p key={i} className="text-sm text-text/80 mb-3 leading-relaxed">{renderInline(paragraph)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function CourseDetailPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetch('/api/training/courses')
      .then(r => r.json())
      .then(data => {
        let found = (data.courses || []).find((c: any) => c.id === courseId);
        // Ensure modules is always an array (JSONB may come as string)
        if (found && typeof found.modules === 'string') {
          try { found = { ...found, modules: JSON.parse(found.modules) }; } catch { found = { ...found, modules: [] }; }
        }
        if (found && !Array.isArray(found.modules)) {
          found = { ...found, modules: [] };
        }
        if (found) {
          setCourse(found);
          const firstIncomplete = (found.modules || []).findIndex(
            (m: Module) => !(found.completedModules || []).includes(m.id)
          );
          if (firstIncomplete >= 0) setActiveModule(firstIncomplete);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleComplete = async () => {
    if (!course) return;
    const mod = course.modules[activeModule];
    if (!mod || completing) return;

    setCompleting(true);

    if (course.status === 'available') {
      await fetch('/api/training/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
    }

    const res = await fetch('/api/training/complete-module', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, moduleId: mod.id }),
    });

    if (res.ok) {
      const completed = [...(course.completedModules || []), mod.id];
      const progress = Math.round((completed.length / course.modules.length) * 100);
      const isComplete = completed.length >= course.modules.length;

      setCourse({
        ...course,
        completedModules: completed,
        progress,
        status: isComplete ? 'completed' : 'in_progress',
      });

      if (activeModule < course.modules.length - 1) {
        setActiveModule(activeModule + 1);
      }
    }
    setCompleting(false);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-semibold text-text">Cours introuvable</p>
        <Link href="/coach/training" className="mt-4 text-sm text-brand-500 hover:underline">
          Retour aux formations
        </Link>
      </div>
    );
  }

  const mod = course.modules[activeModule];
  const isModuleComplete = course.completedModules?.includes(mod?.id);
  const allComplete = course.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/coach/training" className="text-sm text-muted hover:text-text transition">
          ← Retour aux formations
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-3xl">{course.badgeIcon}</span>
          <div>
            <h1 className="text-xl font-extrabold text-text">{course.title}</h1>
            <p className="text-sm text-muted">{course.durationMinutes} min · {course.modules.length} modules</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">{course.completedModules?.length || 0}/{course.modules.length} modules</span>
            <span className="font-semibold text-brand-500">{course.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {course.modules.map((m, i) => {
          const done = course.completedModules?.includes(m.id);
          const current = i === activeModule;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(i)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                current
                  ? 'bg-brand-500 text-white'
                  : done
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-surface text-muted hover:bg-surface/80'
              }`}
            >
              {done && <span>✓</span>}
              <span className="truncate max-w-[150px]">{m.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {mod && (
        <div className="rounded-2xl border border-border bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold text-text mb-4">{mod.title}</h2>
          <RichText content={mod.content} />

          <div className="mt-8 flex items-center justify-between">
            {activeModule > 0 && (
              <button
                onClick={() => setActiveModule(activeModule - 1)}
                className="rounded-xl bg-surface px-5 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface/80"
              >
                ← Précédent
              </button>
            )}
            <div className="ml-auto">
              {allComplete ? (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 px-5 py-2.5 text-sm font-bold text-green-700">
                  <span>🎉</span> Cours terminé !
                </div>
              ) : isModuleComplete ? (
                activeModule < course.modules.length - 1 ? (
                  <button
                    onClick={() => setActiveModule(activeModule + 1)}
                    className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Module suivant →
                  </button>
                ) : (
                  <div className="rounded-xl bg-green-50 px-5 py-2.5 text-sm font-bold text-green-700">✓ Terminé</div>
                )
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
                >
                  {completing ? 'Validation...' : 'Marquer comme lu ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
