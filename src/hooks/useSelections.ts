import { useState, useEffect, useLayoutEffect } from 'react';
import type { Section, Schedule, Preferences, Course } from '../types';
import { generateAllSchedules, checkSectionConflicts } from '../utils/schedule';

interface SelectionsState {
  selectedSections: Map<string, string>;
  currentSchedule: Schedule | null;
  alternativeSchedules: Schedule[];
}

interface SelectionsActions {
  selectSection: (courseId: string, sectionId: string) => void;
  deselectCourse: (courseId: string) => void;
  clearAllSelections: () => void;
  getSelectedSections: () => Section[];
  hasConflict: (section: Section) => boolean;
}

type SelectionsHook = SelectionsState & SelectionsActions;

const STORAGE_KEY = 'course_market_selections';

export function useSelections(
  courses: Course[],
  sections: Section[],
  preferences: Preferences
): SelectionsHook {
  const [selectedSections, setSelectedSections] = useState<Map<string, string>>(new Map());
  const [currentSchedule, setCurrentSchedule] = useState<Schedule | null>(null);
  const [alternativeSchedules, setAlternativeSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const entries = Object.entries(parsed) as [string, string][];
        const map = new Map(entries);
        setSelectedSections(map);
      }
    } catch (error) {
      console.warn('Failed to load stored selections:', error);
    }
  }, []);

  useLayoutEffect(() => {
    const entries = Object.fromEntries(selectedSections);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [selectedSections]);

  useEffect(() => {
    if (courses.length > 0 && sections.length > 0 && selectedSections.size > 0) {
      const selectedSectionIds = Array.from(selectedSections.values());
      const selectedSectionsList = sections.filter(s => 
        selectedSectionIds.includes(s.id)
      );

      const conflicts = checkSectionConflicts(selectedSectionsList);
      
      if (conflicts.length > 0) {
        const validSchedules = generateAllSchedules(
          courses,
          sections,
          selectedSections,
          preferences
        );
        
        if (validSchedules.length > 0) {
          setCurrentSchedule(validSchedules[0]);
          setAlternativeSchedules(validSchedules.slice(1, 6));
        } else {
          setCurrentSchedule(null);
          setAlternativeSchedules([]);
        }
      } else {
        const totalCredits = selectedSectionsList.reduce((sum, s) => {
          const course = courses.find(c => c.id === s.courseId);
          return sum + (course?.credits || 3);
        }, 0);

        setCurrentSchedule({
          id: 'current',
          name: 'Current Selection',
          sections: selectedSectionsList,
          totalCredits,
          score: 0,
          conflicts: [],
        });
        setAlternativeSchedules([]);
      }
    } else {
      setCurrentSchedule(null);
      setAlternativeSchedules([]);
    }
  }, [selectedSections, courses, sections, preferences]);

  const selectSection = (courseId: string, sectionId: string): void => {
    setSelectedSections(prev => {
      const newMap = new Map(prev);
      newMap.set(courseId, sectionId);
      return newMap;
    });
  };

  const deselectCourse = (courseId: string): void => {
    setSelectedSections(prev => {
      const newMap = new Map(prev);
      newMap.delete(courseId);
      return newMap;
    });
  };

  const clearAllSelections = (): void => {
    setSelectedSections(new Map());
    localStorage.removeItem(STORAGE_KEY);
  };

  const getSelectedSections = (): Section[] => {
    const selectedSectionIds = Array.from(selectedSections.values());
    return sections.filter(s => selectedSectionIds.includes(s.id));
  };

  const hasConflict = (section: Section): boolean => {
    const selectedList = getSelectedSections();
    
    for (const selectedSection of selectedList) {
      if (selectedSection.id === section.id) continue;
      
      for (const slot1 of section.timeSlots) {
        for (const slot2 of selectedSection.timeSlots) {
          if (slot1.day === slot2.day) {
            const start1 = parseInt(slot1.startTime.replace(':', ''), 10);
            const end1 = parseInt(slot1.endTime.replace(':', ''), 10);
            const start2 = parseInt(slot2.startTime.replace(':', ''), 10);
            const end2 = parseInt(slot2.endTime.replace(':', ''), 10);
            
            if (start1 < end2 && start2 < end1) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  };

  return {
    selectedSections,
    currentSchedule,
    alternativeSchedules,
    selectSection,
    deselectCourse,
    clearAllSelections,
    getSelectedSections,
    hasConflict,
  };
}