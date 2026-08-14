import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';
import type { Course, Schedule, Section } from '../types';
import { checkConflicts } from '../utils/schedule';

/**
 * Loads courses/sections for the user's active semester and derives the current
 * schedule from the persisted course selections. Re-fetches when the semester
 * changes; otherwise just re-derives the schedule when selections change.
 */
export function useSemesterData() {
  const { profile } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [coursesImported, setCoursesImported] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<Section[]>([]);
  // Semester whose data is currently held in state; a change triggers a re-fetch
  const loadedSemesterRef = useRef<string | null>(null);
  const dataLoadedRef = useRef(false);
  const coursesRef = useRef<Course[]>([]);
  const sectionsRef = useRef<Section[]>([]);

  useEffect(() => {
    coursesRef.current = allCourses;
    sectionsRef.current = allSections;
  }, [allCourses, allSections]);

  const courseSelections = profile?.courseSelections;

  const loadScheduleFromSelections = useCallback(
    (courses: Course[], sections: Section[]) => {
      const selections = courseSelections || {};

      if (Object.keys(selections).length === 0) {
        setSchedule(null);
        setCoursesImported(courses.length > 0);
        return;
      }

      try {
        const sectionMap = new Map(sections.map((s) => [s.id, s]));
        const selectedSections: Section[] = [];
        Object.entries(selections).forEach(([, sectionId]) => {
          const section = sectionMap.get(sectionId);
          if (section) selectedSections.push(section);
        });

        if (selectedSections.length === 0) {
          setSchedule(null);
          setCoursesImported(courses.length > 0);
          return;
        }

        const totalCredits = selectedSections.reduce((sum, s) => {
          const course = courses.find((c) => c.id === s.courseId);
          return sum + (course?.credits || 3);
        }, 0);

        setSchedule({
          id: 'current',
          name: 'Current Selection',
          sections: selectedSections,
          totalCredits,
          score: 0,
          conflicts: checkConflicts(selectedSections),
        });
        setCoursesImported(courses.length > 0);
      } catch (err) {
        console.error('Failed to load schedule from selections:', err);
        setSchedule(null);
        setCoursesImported(courses.length > 0);
      }
    },
    [courseSelections],
  );

  const loadData = useCallback(async () => {
    try {
      if (dataLoadedRef.current) {
        if (coursesRef.current.length > 0 && sectionsRef.current.length > 0) {
          loadScheduleFromSelections(coursesRef.current, sectionsRef.current);
        }
        return;
      }

      const { getSemesters, getSemesterData } = await import('../services/coursesApi');
      const { semesters } = await getSemesters();

      if (!semesters || semesters.length === 0) {
        console.warn('No semesters available');
        setAllCourses([]);
        setAllSections([]);
        setCoursesImported(false);
        setLoading(false);
        return;
      }

      const selectedSemester =
        semesters.find((semester) => semester.id === profile?.semesterId) ||
        semesters.find((semester) => semester.isActive) ||
        semesters[0];
      const semesterId = selectedSemester.id;

      const { courses, sections } = await getSemesterData(semesterId);

      setAllCourses(courses);
      setAllSections(sections);
      loadScheduleFromSelections(courses, sections);

      dataLoadedRef.current = true;
    } catch (error) {
      console.error('Failed to load semester data:', error);
      setAllCourses([]);
      setAllSections([]);
      setCoursesImported(false);
    } finally {
      setLoading(false);
    }
  }, [loadScheduleFromSelections, profile?.semesterId]);

  // A semester switch requires a full re-fetch; everything else can be
  // re-derived from the already-loaded data inside loadData.
  useEffect(() => {
    if (loadedSemesterRef.current === profile?.semesterId) return;
    loadedSemesterRef.current = profile?.semesterId ?? null;
    dataLoadedRef.current = false;
  }, [profile?.semesterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { loading, coursesImported, schedule, setSchedule, allCourses, allSections };
}
