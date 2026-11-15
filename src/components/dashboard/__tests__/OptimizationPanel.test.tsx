import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Schedule } from '../../../types';
import { OptimizationPanel } from '../OptimizationPanel';

const mockSchedule: Schedule = {
  id: 'sched-1',
  sections: [
    {
      id: 'sec-1',
      courseId: 'course-1',
      sectionNumber: '1',
      instructor: 'Dr. Turing',
      capacity: 30,
      enrolled: 25,
      timeSlots: [
        {
          day: 'M',
          startTime: '09:00',
          endTime: '10:15',
        },
      ],
    },
  ],
  totalCredits: 3,
  score: 85,
  conflicts: [],
};

describe('OptimizationPanel', () => {
  it('renders primary Explore All Alternatives button first and Auto-Optimize second', () => {
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Explore All Alternatives');
    expect(buttons[1]).toHaveTextContent('Auto-Optimize Schedule');
  });

  it('triggers onGenerateAll when Explore All Alternatives is clicked', () => {
    const handleGenerateAll = vi.fn();
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={handleGenerateAll}
      />,
    );

    const exploreBtn = screen.getByRole('button', { name: /explore all alternatives/i });
    fireEvent.click(exploreBtn);
    expect(handleGenerateAll).toHaveBeenCalledTimes(1);
  });

  it('triggers onOptimize when Auto-Optimize is clicked', () => {
    const handleOptimize = vi.fn();
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={handleOptimize}
        onGenerateAll={vi.fn()}
      />,
    );

    const optimizeBtn = screen.getByRole('button', { name: /auto-optimize/i });
    fireEvent.click(optimizeBtn);
    expect(handleOptimize).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when schedule is empty', () => {
    render(
      <OptimizationPanel
        schedule={{ id: 'empty', sections: [], totalCredits: 0, score: 0, conflicts: [] }}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
      />,
    );

    const exploreBtn = screen.getByRole('button', { name: /explore all alternatives/i });
    const optimizeBtn = screen.getByRole('button', { name: /auto-optimize/i });

    expect(exploreBtn).toBeDisabled();
    expect(optimizeBtn).toBeDisabled();
  });

  it('displays progress bar and percentage when generating', () => {
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={true}
        generationProgress={65}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /generating alternatives/i })).toBeDisabled();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThanOrEqual(1);
  });

  it('displays optimizing timetable status when optimizing', () => {
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={true}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /optimizing timetable/i })).toBeDisabled();
  });

  it('renders alert when error message is provided and calls onClearError', () => {
    const handleClearError = vi.fn();
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error="Failed to generate timetable combinations"
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
        onClearError={handleClearError}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Failed to generate timetable combinations');

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(handleClearError).toHaveBeenCalledTimes(1);
  });

  it('renders undo button when canUndo is true and calls onUndo', () => {
    const handleUndo = vi.fn();
    render(
      <OptimizationPanel
        schedule={mockSchedule}
        optimizing={false}
        generating={false}
        generationProgress={0}
        error=""
        onOptimize={vi.fn()}
        onGenerateAll={vi.fn()}
        onUndo={handleUndo}
        canUndo={true}
      />,
    );

    const undoBtn = screen.getByRole('button', { name: /revert to previous schedule/i });
    expect(undoBtn).toBeInTheDocument();
    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });
});
