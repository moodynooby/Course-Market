import { useState } from 'react';
import type { Course, Section } from '../types';

interface CourseListProps {
  courses: Course[];
  sections: Section[];
  selectedSections: Map<string, string>;
  onSelectSection: (courseId: string, sectionId: string) => void;
  onDeselectCourse: (courseId: string) => void;
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
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
  const dayDisplay = section.timeSlots
    .map((slot) => slot.day)
    .filter((day, index, arr) => arr.indexOf(day) === index)
    .join('');

  const timeDisplay =
    section.timeSlots.length > 0
      ? `${formatTime(section.timeSlots[0].startTime)} - ${formatTime(section.timeSlots[0].endTime)}`
      : 'TBA';

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
          <span className="label">Location:</span>
          <span className="value">{section.location}</span>
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

  const subjects = Array.from(new Set(courses.map((course) => course.subject))).sort();

  const filteredCourses = courses.filter((course) => {
    const matchesSubject = selectedSubject === 'all' || course.subject === selectedSubject;
    const matchesSearch =
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const courseSections = (courseId: string): Section[] =>
    sections.filter((section) => section.courseId === courseId);

  const hasConflict = (section: Section): boolean => {
    const selectedSectionIds = Array.from(selectedSections.values());
    const selectedSectionsList = sections.filter((s) => selectedSectionIds.includes(s.id));

    for (const selectedSection of selectedSectionsList) {
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
