'use client';

import { useState, useEffect } from 'react';
import { PathwayTracker } from '@/components/training/pathway-tracker';
import { CourseCard } from '@/components/training/course-card';
import { CertificationBadge } from '@/components/training/certification-badge';

interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  badgeIcon: string;
  requiredForVerification: boolean;
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  completedAt?: string;
}

interface PathwayData {
  steps: Array<{ key: string; label: string; description: string; completed: boolean; current: boolean }>;
  currentStep: number;
  isVerified: boolean;
}

export default function TrainingPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [pathway, setPathway] = useState<PathwayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/training/courses')
      .then((r) => r.json())
      .then((data) => {
        setCourses(data.courses || []);
        setPathway(data.pathway || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId);
    try {
      const res = await fetch('/api/training/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      if (res.ok) {
        // Refresh data
        const updated = await fetch('/api/training/courses').then((r) => r.json());
        setCourses(updated.courses || []);
        setPathway(updated.pathway || null);
      }
    } catch {
      // Ignore
    } finally {
      setEnrolling(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  const completedCourses = courses.filter((c) => c.status === 'completed');

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Formation & certification</h1>

      {/* Coach pathway */}
      {pathway && (
        <PathwayTracker steps={pathway.steps} isVerified={pathway.isVerified} />
      )}

      {/* Earned badges */}
      {completedCourses.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-500">Vos certifications</h2>
          <div className="flex flex-wrap gap-2">
            {completedCourses.map((c) => (
              <CertificationBadge key={c.id} icon={c.badgeIcon} title={c.title} completedAt={c.completedAt} />
            ))}
          </div>
        </div>
      )}

      {/* Available courses */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-gray-500">Cours disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              title={course.title}
              description={course.description}
              category={course.category}
              durationMinutes={course.durationMinutes}
              badgeIcon={course.badgeIcon}
              requiredForVerification={course.requiredForVerification}
              status={course.status}
              progress={course.progress}
              onEnroll={() => handleEnroll(course.id)}
              loading={enrolling === course.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
