import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Course, Section } from '../../types';
import { CourseCard } from '../CourseCard';

const mockCourse: Course = {
  id: 'course-1',
  code: 'CSE101',
  name: 'Introduction to Computer Science',
  subject: 'CSE',
  credits: 3,
  description: 'Foundational programming and algorithmic problem solving.',
};

const mockSections: Section[] = [
  {
    id: 'sec-1',
    courseId: 'course-1',
    sectionNumber: '1',
    instructor: 'Dr. Alan Turing',
    capacity: 30,
    enrolled: 25,
    timeSlots: [
      {
        day: 'M',
        startTime: '09:00',
        endTime: '10:15',
      },
      {
        day: 'W',
        startTime: '09:00',
        endTime: '10:15',
      },
    ],
  },
  {
    id: 'sec-2',
    courseId: 'course-1',
    sectionNumber: '2',
    instructor: 'Dr. Grace Hopper',
    capacity: 20,
    enrolled: 20,
    timeSlots: [
      {
        day: 'T',
        startTime: '11:00',
        endTime: '12:15',
      },
    ],
  },
];

describe('CourseCard', () => {
  it('renders collapsed view with rich metadata', () => {
    const handleExpand = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MemoryRouter>
        <CourseCard
          course={mockCourse}
          sections={mockSections}
          isExpanded={false}
          conflictIds={new Set()}
          onExpand={handleExpand}
          onSelectSection={handleSelect}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('CSE101')).toBeInTheDocument();
    expect(screen.getByText('Introduction to Computer Science')).toBeInTheDocument();
    expect(screen.getByText('CSE')).toBeInTheDocument();
    expect(screen.getByText('3 cr')).toBeInTheDocument();
    expect(screen.getByText('2 sections')).toBeInTheDocument();
    expect(screen.getByText(/Taught by: Dr. Alan Turing, Dr. Grace Hopper/)).toBeInTheDocument();
    expect(screen.getByText('5 spots open across sections')).toBeInTheDocument();
  });

  it('triggers onExpand when clicking anywhere on the header', () => {
    const handleExpand = vi.fn();
    const handleSelect = vi.fn();

    render(
      <MemoryRouter>
        <CourseCard
          course={mockCourse}
          sections={mockSections}
          isExpanded={false}
          conflictIds={new Set()}
          onExpand={handleExpand}
          onSelectSection={handleSelect}
        />
      </MemoryRouter>,
    );

    const header = screen.getByRole('button', {
      name: /Expand CSE101 Introduction to Computer Science/i,
    });
    fireEvent.click(header);
    expect(handleExpand).toHaveBeenCalledTimes(1);
  });

  it('renders description, seat availability, day pills, and conflicts when expanded', () => {
    const handleExpand = vi.fn();
    const handleSelect = vi.fn();
    const handlePin = vi.fn();

    const conflictIds = new Set(['sec-1']);
    const conflictDetails = new Map([['sec-1', 'MATH101 Sec 1']]);

    render(
      <MemoryRouter>
        <CourseCard
          course={mockCourse}
          sections={mockSections}
          selectedSectionId="sec-2"
          pinnedSectionId="sec-2"
          isExpanded={true}
          conflictIds={conflictIds}
          conflictDetails={conflictDetails}
          onExpand={handleExpand}
          onSelectSection={handleSelect}
          onTogglePin={handlePin}
        />
      </MemoryRouter>,
    );

    // Description is visible
    expect(
      screen.getByText('Foundational programming and algorithmic problem solving.'),
    ).toBeInTheDocument();

    // Section 1: open seats & conflict with details
    expect(screen.getByText('5 seats left (25/30)')).toBeInTheDocument();
    expect(screen.getByText('Conflict: MATH101 Sec 1')).toBeInTheDocument();

    // Section 2: Full seats & selected
    expect(screen.getByText('Full (0 seats)')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();

    // Day badges
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();

    // Click section to select
    const sec1Card = screen.getByRole('button', { name: /Select section 1/i });
    fireEvent.click(sec1Card);
    expect(handleSelect).toHaveBeenCalledWith('sec-1');

    // Click pin to toggle
    const pinBtn = screen.getByRole('button', { name: /Unpin section/i });
    fireEvent.click(pinBtn);
    expect(handlePin).toHaveBeenCalledWith('sec-2');
  });
});
