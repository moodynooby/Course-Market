import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAutoPersistence } from '../hooks/useAutoPersistence';
import { getSemesterData, getSemesters } from '../services/coursesApi';
import { buildCourseIndex } from '../services/search';
import type { Course, Schedule, Section } from '../types';
import { checkConflicts, sectionsToCourseSelections } from '../utils/schedule';
import { useAuthContext } from './AuthContext';
import { useToast } from './ToastContext';

export interface CourseSelectionContextValue {
  semesterId: string;
  semesterName: string;
  availableSemesters: Array<{ id: string; name: string; isActive: boolean }>;
  courses: Course[];
  sections: Section[];
  loading: boolean;
  coursesImported: boolean;
  error: string | null;

  selectedSections: Map<string, string>;
  pinnedSections: Map<string, string>;
  schedule: Schedule | null;

  selectSection: (courseId: string, sectionId: string) => void;
  togglePin: (courseId: string, sectionId: string) => void;
  deselectCourse: (courseId: string) => void;
  clearAllSelections: () => void;
  applySchedule: (newSchedule: Schedule) => Promise<void>;
  switchSemester: (newSemesterId: string, newSemesterName?: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
}

const CourseSelectionContext = createContext<CourseSelectionContextValue | null>(null);

function deriveScheduleFromSelections(
  selections: Map<string, string>,
  courses: Course[],
  sections: Section[],
): Schedule | null {
  if (selections.size === 0) return null;

  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  const matchedSections: Section[] = [];

  for (const [, sectionId] of selections) {
    const matched = sectionMap.get(sectionId);
    if (matched) matchedSections.push(matched);
  }

  if (matchedSections.length === 0) return null;

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const totalCredits = matchedSections.reduce((sum, sec) => {
    const course = courseMap.get(sec.courseId);
    return sum + (course?.credits || 3);
  }, 0);

  return {
    id: 'current',
    sections: matchedSections,
    totalCredits,
    score: 0,
    conflicts: checkConflicts(matchedSections),
  };
}

export function CourseSelectionProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile, isAuthenticated } = useAuthContext();
  const { toast } = useToast();

  const [availableSemesters, setAvailableSemesters] = useState<
    Array<{ id: string; name: string; isActive: boolean }>
  >([]);
  const [semesterId, setSemesterId] = useState<string>('');
  const [semesterName, setSemesterName] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(new Map());
  const [pinnedSections, setPinnedSections] = useState<Map<string, string>>(new Map());
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const initialProfileSyncedRef = useRef(false);
  const loadedSemesterRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Persistence Engine for saving course & pinned selections to profile
  const persistence = useAutoPersistence<{
    courseSelections: Record<string, string>;
    pinnedSelections: Record<string, string>;
  }>({
    debounceMs: 300,
    onSave: async (payload) => {
      if (!isAuthenticated) return;
      isInternalUpdateRef.current = true;
      try {
        await updateProfile(payload);
      } finally {
        isInternalUpdateRef.current = false;
      }
    },
    onError: (err) => {
      console.error('[CourseSelectionContext] Save failed:', err);
      toast.error('Failed to save course selections. Please try again.');
    },
  });

  const loadSemesterCatalog = useCallback(async (semId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSemesterData(semId);
      buildCourseIndex(data.courses, data.sections);
      setCourses(data.courses);
      setSections(data.sections);
      loadedSemesterRef.current = semId;
      return data;
    } catch (err) {
      console.error('[CourseSelectionContext] Error loading semester data:', err);
      setError('Failed to load courses for this semester.');
      setCourses([]);
      setSections([]);
      return { courses: [], sections: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize available semesters and active semester on mount
  useEffect(() => {
    let mounted = true;
    async function initSemesters() {
      try {
        const { semesters } = await getSemesters();
        if (!mounted || !semesters || semesters.length === 0) {
          if (mounted) setLoading(false);
          return;
        }

        setAvailableSemesters(semesters);

        const targetSemId =
          profile?.semesterId || semesters.find((s) => s.isActive)?.id || semesters[0].id;

        const targetSem = semesters.find((s) => s.id === targetSemId) || semesters[0];
        setSemesterId(targetSem.id);
        setSemesterName(targetSem.name);

        await loadSemesterCatalog(targetSem.id);
      } catch (err) {
        if (mounted) {
          console.error('[CourseSelectionContext] Failed to init semesters:', err);
          setError('Failed to load semesters.');
          setLoading(false);
        }
      }
    }

    initSemesters();
    return () => {
      mounted = false;
    };
  }, [loadSemesterCatalog, profile?.semesterId]);

  // Sync profile selections when profile loads from server
  useEffect(() => {
    if (!profile || isInternalUpdateRef.current) return;

    if (!initialProfileSyncedRef.current) {
      initialProfileSyncedRef.current = true;
      const initialSelections = new Map(Object.entries(profile.courseSelections || {}));
      const initialPins = new Map(Object.entries(profile.pinnedSelections || {}));
      setSelectedSections(initialSelections);
      setPinnedSections(initialPins);
    }
  }, [profile]);

  // Whenever selectedSections or catalog changes, re-derive schedule
  useEffect(() => {
    const derived = deriveScheduleFromSelections(selectedSections, courses, sections);
    setSchedule(derived);
  }, [selectedSections, courses, sections]);

  const commitSelections = useCallback(
    (newSelections: Map<string, string>, newPins: Map<string, string>) => {
      setSelectedSections(newSelections);
      setPinnedSections(newPins);

      persistence.queueSave({
        courseSelections: Object.fromEntries(newSelections),
        pinnedSelections: Object.fromEntries(newPins),
      });
    },
    [persistence],
  );

  const selectSection = useCallback(
    (courseId: string, sectionId: string) => {
      const nextSelections = new Map(selectedSections);
      const nextPins = new Map(pinnedSections);

      if (nextSelections.get(courseId) === sectionId) {
        nextSelections.delete(courseId);
        nextPins.delete(courseId);
      } else {
        nextSelections.set(courseId, sectionId);
      }

      commitSelections(nextSelections, nextPins);
    },
    [selectedSections, pinnedSections, commitSelections],
  );

  const deselectCourse = useCallback(
    (courseId: string) => {
      const nextSelections = new Map(selectedSections);
      const nextPins = new Map(pinnedSections);

      nextSelections.delete(courseId);
      nextPins.delete(courseId);

      commitSelections(nextSelections, nextPins);
    },
    [selectedSections, pinnedSections, commitSelections],
  );

  const togglePin = useCallback(
    (courseId: string, sectionId: string) => {
      const nextPins = new Map(pinnedSections);

      if (nextPins.get(courseId) === sectionId) {
        nextPins.delete(courseId);
      } else {
        nextPins.set(courseId, sectionId);
      }

      commitSelections(selectedSections, nextPins);
    },
    [selectedSections, pinnedSections, commitSelections],
  );

  const clearAllSelections = useCallback(() => {
    commitSelections(new Map(), new Map());
  }, [commitSelections]);

  const applySchedule = useCallback(
    async (newSchedule: Schedule) => {
      const newSelections = sectionsToCourseSelections(newSchedule.sections);
      const nextSelections = new Map(Object.entries(newSelections));

      // Keep only pins that exist in the newly applied schedule
      const nextPins = new Map<string, string>();
      for (const [cId, secId] of pinnedSections) {
        if (nextSelections.get(cId) === secId) {
          nextPins.set(cId, secId);
        }
      }

      setSelectedSections(nextSelections);
      setPinnedSections(nextPins);
      setSchedule(newSchedule);

      persistence.queueSave({
        courseSelections: newSelections,
        pinnedSelections: Object.fromEntries(nextPins),
      });
      await persistence.flush();
    },
    [pinnedSections, persistence],
  );

  const switchSemester = useCallback(
    async (newSemesterId: string, newSemesterName?: string) => {
      if (newSemesterId === semesterId) return;

      // 1. Reset selections
      setSelectedSections(new Map());
      setPinnedSections(new Map());
      setSchedule(null);
      setSemesterId(newSemesterId);
      if (newSemesterName) {
        setSemesterName(newSemesterName);
      } else {
        const found = availableSemesters.find((s) => s.id === newSemesterId);
        if (found) setSemesterName(found.name);
      }

      // 2. Load new catalog
      await loadSemesterCatalog(newSemesterId);

      // 3. Immediately persist semester and wiped selections to database
      if (isAuthenticated) {
        try {
          await updateProfile({
            semesterId: newSemesterId,
            courseSelections: {},
            pinnedSelections: {},
          });
        } catch (err) {
          console.error('[CourseSelectionContext] Failed to persist semester change:', err);
          toast.error('Failed to change semester. Please try again.');
        }
      }
    },
    [semesterId, availableSemesters, loadSemesterCatalog, isAuthenticated, updateProfile, toast],
  );

  const refreshCatalog = useCallback(async () => {
    if (semesterId) {
      await loadSemesterCatalog(semesterId);
    }
  }, [semesterId, loadSemesterCatalog]);

  const value = useMemo<CourseSelectionContextValue>(
    () => ({
      semesterId,
      semesterName,
      availableSemesters,
      courses,
      sections,
      loading,
      coursesImported: courses.length > 0,
      error,
      selectedSections,
      pinnedSections,
      schedule,
      selectSection,
      togglePin,
      deselectCourse,
      clearAllSelections,
      applySchedule,
      switchSemester,
      refreshCatalog,
    }),
    [
      semesterId,
      semesterName,
      availableSemesters,
      courses,
      sections,
      loading,
      error,
      selectedSections,
      pinnedSections,
      schedule,
      selectSection,
      togglePin,
      deselectCourse,
      clearAllSelections,
      applySchedule,
      switchSemester,
      refreshCatalog,
    ],
  );

  return (
    <CourseSelectionContext.Provider value={value}>{children}</CourseSelectionContext.Provider>
  );
}

export function useCourseSelection(): CourseSelectionContextValue {
  const context = useContext(CourseSelectionContext);
  if (!context) {
    throw new Error('useCourseSelection must be used within a CourseSelectionProvider');
  }
  return context;
}
