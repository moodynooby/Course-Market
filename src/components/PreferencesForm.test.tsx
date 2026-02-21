import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Preferences } from '../types';
import { PreferencesForm } from './PreferencesForm';

describe('PreferencesForm', () => {
  const mockOnUpdate = vi.fn();
  const basePreferences: Preferences = {
    userId: 'u1',
    displayName: 'Test User',
    preferredStartTime: '08:00',
    preferredEndTime: '17:00',
    maxGapMinutes: 60,
    preferConsecutiveDays: true,
    preferMorning: false,
    preferAfternoon: false,
    maxCredits: 18,
    minCredits: 12,
    avoidDays: [],
    excludeInstructors: [],
  };

  it('renders form with preferences', () => {
    render(<PreferencesForm preferences={basePreferences} onUpdate={mockOnUpdate} />);
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('allows updating display name', () => {
    render(<PreferencesForm preferences={basePreferences} onUpdate={mockOnUpdate} />);
    const input = screen.getByDisplayValue('Test User');
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(mockOnUpdate).toHaveBeenCalledWith('displayName', 'New Name');
  });

  it('allows toggling days to avoid', () => {
    render(<PreferencesForm preferences={basePreferences} onUpdate={mockOnUpdate} />);
    const monButton = screen.getByText('Mon');
    fireEvent.click(monButton);
    expect(mockOnUpdate).toHaveBeenCalledWith('avoidDays', ['M']);
  });
});
