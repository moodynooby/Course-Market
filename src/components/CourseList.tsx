import { useState, useMemo, useCallback } from 'react';
import type { Course, Section } from '../types';
import { formatTime, hasSectionConflict, formatTimeSlots } from '../utils/schedule';

interface CourseListProps {
  courses: Course[];
  sections: Section[];
  selectedSections: Map<string, string>;
  onSelectSection: (courseId: string, sectionId: string) => void;
  onDeselectCourse: (courseId: string) => void;
}

function SectionCard({
  section,
  isSelected,
  hasConflict,
  onClick,
}: {
  section: Section;
  isSelected: boolean;
  hasConflict: boolean;
  onClick: () => void;
}) {
  const { dayDisplay, timeDisplay } = formatTimeSlots(section.timeSlots);

  return (
    <div
      className={`section-card ${isSelected ? 'selected' : ''} ${hasConflict ? 'conflict' : ''}`}
      onClick={onClick}
    >
      <div className="section-header">
        <span className="section-number">Section {section.sectionNumber}</span>
        <span className={`status ${isSelected ? 'selected' : ''}`}>
          {isSelected ? '✓ Selected' : hasConflict ? '⚠ Conflict' : 'Select'}
        </span>
      </div>

      <div className="section-details">
        <div className="detail-row">
          <span className="label">Instructor:</span>
          <span className="value">{section.instructor}</span>
        </div>
        <div className="detail-row">
          <span className="label">Schedule:</span>
          <span className="value">
            {dayDisplay} {timeDisplay}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Enrollment:</span>
          <span className="value">
            {section.enrolled}/{section.capacity}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CourseList({
  courses,
  sections,
  selectedSections,
  onSelectSection,
  onDeselectCourse,
}: CourseListProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const subjects = useMemo(
    () => Array.from(new Set(courses.map((course) => course.subject))).sort(),
    [courses],
  );

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject;
        const matchesSearch =
          course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSubject && matchesSearch;
      }),
    [courses, selectedSubject, searchTerm],
  );

  const courseSectionsMap = useMemo(() => {
    const map = new Map<string, Section[]>();
    sections.forEach((section) => {
      const existing = map.get(section.courseId) || [];
      existing.push(section);
      map.set(section.courseId, existing);
    });
    return map;
  }, [sections]);

  const courseSections = useCallback(
    (courseId: string): Section[] => courseSectionsMap.get(courseId) || [],
    [courseSectionsMap],
  );

  const selectedSectionsList = useMemo(() => {
    const ids = new Set(selectedSections.values());
    return sections.filter((s) => ids.has(s.id));
  }, [selectedSections, sections]);

  const hasConflict = useCallback(
    (section: Section): boolean =>
      selectedSectionsList.some(
        (selected) => selected.id !== section.id && hasSectionConflict(section, selected),
      ),
    [selectedSectionsList],
  );

  const getSelectedSection = (courseId: string): Section | undefined => {
    const sectionId = selectedSections.get(courseId);
    return sectionId ? sections.find((s) => s.id === sectionId) : undefined;
  };

  if (courses.length === 0) {
    return (
      <div className="course-list empty">
        <p>No courses loaded. Please upload a CSV file to get started.</p>
      </div>
    );
  }

  return (
    <div className="course-list">
      <div className="course-filters">
        <h2>📚 Course Browser</h2>

        <div className="filter-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="subject-filter">
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="selected-count">
          Selected: {selectedSections.size} course{selectedSections.size !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="courses-grid">
        {filteredCourses.map((course) => {
          const courseSectionList = courseSections(course.id);
          const selectedSection = getSelectedSection(course.id);
          const isExpanded = expandedCourse === course.id;

          return (
            <div key={course.id} className="course-card">
              <div
                className="course-header"
                onClick={() => setExpandedCourse(isExpanded ? null : course.id)}
              >
                <div className="course-info">
                  <h3>{course.code}</h3>
                  <p className="course-name">{course.name}</p>
                  <p className="course-credits">{course.credits} credits</p>
                </div>

                <div className="course-actions">
                  {selectedSection && (
                    <button
                      className="deselect-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeselectCourse(course.id);
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <span className="expand-icon">
                    {isExpanded ? '▼' : '▶'} ({courseSectionList.length} sections)
                  </span>
                </div>
              </div>

              {selectedSection && (
                <div className="selected-section-info">
                  <strong>Selected:</strong> Section {selectedSection.sectionNumber} -{' '}
                  {selectedSection.instructor}
                </div>
              )}

              {isExpanded && (
                <div className="sections-list">
                  {courseSectionList.map((section) => {
                    const isSelected = selectedSections.get(course.id) === section.id;
                    const conflict = hasConflict(section);

                    return (
                      <SectionCard
                        key={section.id}
                        section={section}
                        isSelected={isSelected}
                        hasConflict={conflict}
                        onClick={() => onSelectSection(course.id, section.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="no-results">
          <p>No courses found matching your filters.</p>
        </div>
      )}
    </div>
  );
}
