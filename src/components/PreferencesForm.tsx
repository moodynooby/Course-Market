import type { DayOfWeek, Preferences } from '../types';

interface PreferencesFormProps {
  preferences: Preferences;
  onUpdate: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'M', label: 'Mon' },
  { value: 'T', label: 'Tue' },
  { value: 'W', label: 'Wed' },
  { value: 'Th', label: 'Thu' },
  { value: 'F', label: 'Fri' },
  { value: 'Sa', label: 'Sat' },
  { value: 'Su', label: 'Sun' },
];

export function PreferencesForm({ preferences, onUpdate }: PreferencesFormProps) {
  const handleDayToggle = (day: DayOfWeek) => {
    const current = preferences.avoidDays;
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onUpdate('avoidDays', updated);
  };

  const handleInstructorChange = (value: string) => {
    const instructors = value
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);
    onUpdate('excludeInstructors', instructors);
  };

  return (
    <div className="preferences-form">
      <h2>⚙️ Schedule Preferences</h2>

      <div className="form-section">
        <h3>⏰ Time Preferences</h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="preferredStartTime">Preferred Start Time</label>
            <input
              id="preferredStartTime"
              type="time"
              value={preferences.preferredStartTime}
              onChange={(e) => onUpdate('preferredStartTime', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="preferredEndTime">Preferred End Time</label>
            <input
              id="preferredEndTime"
              type="time"
              value={preferences.preferredEndTime}
              onChange={(e) => onUpdate('preferredEndTime', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Time of Day Preference</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.preferMorning}
                onChange={(e) => onUpdate('preferMorning', e.target.checked)}
              />
              🌅 Prefer Morning (before noon)
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.preferAfternoon}
                onChange={(e) => onUpdate('preferAfternoon', e.target.checked)}
              />
              🌇 Prefer Afternoon (noon - 5pm)
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>📅 Schedule Preferences</h3>

        <div className="form-row">
          <div className="form-group">
            <label>Minimum Credits</label>
            <input
              type="number"
              min="0"
              max="24"
              value={preferences.minCredits}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const value = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(24, raw));
                onUpdate('minCredits', value);
              }}
            />
          </div>

          <div className="form-group">
            <label>Maximum Credits</label>
            <input
              type="number"
              min="0"
              max="24"
              value={preferences.maxCredits}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const value = Number.isNaN(raw)
                  ? preferences.minCredits
                  : Math.max(preferences.minCredits, Math.min(24, raw));
                onUpdate('maxCredits', value);
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Max Gap Between Classes (minutes)</label>
          <input
            type="range"
            min="0"
            max="180"
            step="15"
            value={preferences.maxGapMinutes}
            onChange={(e) => {
              const raw = Number(e.target.value);
              const value = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(180, raw));
              onUpdate('maxGapMinutes', value);
            }}
          />
          <span className="range-value">{preferences.maxGapMinutes} minutes</span>
        </div>

        <div className="form-group">
          <label>Days to Avoid</label>
          <div className="day-buttons">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={`day-btn ${preferences.avoidDays.includes(day.value) ? 'active' : ''}`}
                onClick={() => handleDayToggle(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.preferConsecutiveDays}
              onChange={(e) => onUpdate('preferConsecutiveDays', e.target.checked)}
            />
            Prefer Consecutive Days (e.g., MWF or TTh)
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>👨‍🏫 Instructor Preferences</h3>

        <div className="form-group">
          <label>Instructors to Exclude (comma-separated)</label>
          <input
            type="text"
            value={preferences.excludeInstructors.join(', ')}
            onChange={(e) => handleInstructorChange(e.target.value)}
            placeholder="Dr. Smith, Prof. Jones"
          />
        </div>
      </div>
    </div>
  );
}
