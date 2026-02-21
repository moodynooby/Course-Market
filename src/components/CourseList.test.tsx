import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Course, Section } from '../types';
import { CourseList } from './CourseList';

describe('CourseList', () => {
  const mockCourses: Course[] = [
    {
      id: 'c1',
      code: 'COM101',
      name: 'Intro to CS',
      subject: 'COM',
      credits: 3,
    },
  ];

  const mockSections: Section[] = [
    {
      id: 's1',
      courseId: 'c1',
      sectionNumber: '1',
      instructor: 'Dr. Smith',
      timeSlots: [{ day: 'M', startTime: '09:00', endTime: '10:00' }],
      capacity: 30,
      enrolled: 0,
    },
  ];

  const mockOnSelectSection = vi.fn();
  const mockOnDeselectCourse = vi.fn();

  const renderComponent = () =>
    render(
      <CourseList
        courses={mockCourses}
        sections={mockSections}
        selectedSections={new Map()}
        onSelectSection={mockOnSelectSection}
        onDeselectCourse={mockOnDeselectCourse}
      />,
    );

  it('renders empty state when no courses', () => {
    render(
      <CourseList
        courses={[]}
        sections={[]}
        selectedSections={new Map()}
        onSelectSection={mockOnSelectSection}
        onDeselectCourse={mockOnDeselectCourse}
      />,
    );
    expect(screen.getByText(/No courses loaded/i)).toBeInTheDocument();
  });

  it('renders course list with courses', () => {
    renderComponent();
    expect(screen.getByText('Intro to CS')).toBeInTheDocument();
    expect(screen.getByText('COM101')).toBeInTheDocument();
  });

  it('has filter and search controls', () => {
    renderComponent();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search courses/i)).toBeInTheDocument();
  });
});
