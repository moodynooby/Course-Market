import type { Schedule, Section, DayOfWeek } from '../types';

interface ScheduleViewProps {
  currentSchedule: Schedule | null;
  alternativeSchedules: Schedule[];
  aiAnalysis?: string;
  error?: string;
  isOptimizing?: boolean;
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes}${period}`;
}

const DAYS_ORDER: DayOfWeek[] = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];
const DAYS_FULL = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  Th: 'Thursday',
  F: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

function TimeSlot({
  section,
  day,
  slotIndex,
  totalSlots,
}: {
  section: Section;
  day: DayOfWeek;
  slotIndex: number;
  totalSlots: number;
}) {
  const slot = section.timeSlots.find((s) => s.day === day);
  if (!slot) return null;

  const startTime = parseInt(slot.startTime.replace(':', ''), 10);
  const endTime = parseInt(slot.endTime.replace(':', ''), 10);

  return (
    <div
      className="time-slot"
      style={{
        gridRow: `${startTime - 800 + 2} / ${endTime - 800 + 2}`,
        gridColumn: `${slotIndex + 1} / ${totalSlots + 1}`,
      }}
    >
      <div className="course-info">
        <div className="course-code">{section.sectionNumber}</div>
        <div className="course-time">
          {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
        </div>
        <div className="instructor">{section.instructor}</div>
        <div className="location">{section.location}</div>
      </div>
    </div>
  );
}

function ScheduleGrid({ schedule }: { schedule: Schedule }) {
  const gridStyle = {
    gridTemplateRows: 'repeat(12, 1fr)',
    gridTemplateColumns: `repeat(${DAYS_ORDER.length}, 1fr)`,
  };

  return (
    <div className="schedule-grid" style={gridStyle}>
      <div className="time-labels">
        {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((hour) => (
          <div key={hour} className="time-label">
            {formatTime(`${hour.toString().padStart(2, '0')}:00`)}
          </div>
        ))}
      </div>

      <div className="day-headers">
        {DAYS_ORDER.map((day) => (
          <div key={day} className="day-header">
            {DAYS_FULL[day]}
          </div>
        ))}
      </div>

      <div className="time-slots">
        {schedule.sections.map((section, index) => (
          <TimeSlot
            key={`${section.id}-${index}`}
            section={section}
            day={DAYS_ORDER[index % DAYS_ORDER.length]}
            slotIndex={index}
            totalSlots={DAYS_ORDER.length}
          />
        ))}
      </div>

      <div className="grid-lines">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="horizontal-line" style={{ gridRow: i + 2 }} />
        ))}
        {DAYS_ORDER.map((_, i) => (
          <div key={i} className="vertical-line" style={{ gridColumn: i + 2 }} />
        ))}
      </div>
    </div>
  );
}

function ScheduleList({ schedule }: { schedule: Schedule }) {
  return (
    <div className="schedule-list">
      {schedule.sections.map((section) => {
        const times = section.timeSlots
          .map((slot) => `${slot.day} ${formatTime(slot.startTime)}-${formatTime(slot.endTime)}`)
          .join(', ');

        return (
          <div key={section.id} className="schedule-item">
            <div className="section-header">
              <span className="section-number">{section.sectionNumber}</span>
              <span className="instructor">{section.instructor}</span>
            </div>
            <div className="section-details">
              <span className="time">{times}</span>
              <span className="location">{section.location}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ScheduleView({
  currentSchedule,
  alternativeSchedules,
  aiAnalysis,
  error,
  isOptimizing,
}: ScheduleViewProps) {
  if (isOptimizing) {
    return (
      <div className="schedule-view optimizing">
        <h2>🧠 AI Schedule Optimization</h2>
        <div className="optimizing-message">
          <div className="loading-spinner">⏳</div>
          <p>Analyzing schedules with AI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schedule-view error">
        <h2>🧠 Schedule Optimization</h2>
        <div className="error-message">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!currentSchedule) {
    return (
      <div className="schedule-view empty">
        <h2>📋 Schedule View</h2>
        <p>Select courses and sections to see your schedule here.</p>
      </div>
    );
  }

  return (
    <div className="schedule-view">
      <div className="schedule-header">
        <h2>📋 Optimized Schedule</h2>
        <div className="schedule-stats">
          <span className="credits">Credits: {currentSchedule.totalCredits}</span>
          <span className="score">Score: {currentSchedule.score}/100</span>
        </div>
      </div>

      {currentSchedule.conflicts.length > 0 && (
        <div className="conflicts-warning">
          <h4>⚠️ Schedule Conflicts:</h4>
          <ul>
            {currentSchedule.conflicts.map((conflict, i) => (
              <li key={i}>{conflict}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="schedule-content">
        <div className="schedule-grid-view">
          <ScheduleGrid schedule={currentSchedule} />
        </div>

        <div className="schedule-list-view">
          <ScheduleList schedule={currentSchedule} />
        </div>
      </div>

      {aiAnalysis && (
        <div className="ai-analysis">
          <h3>🤖 AI Analysis</h3>
          <div className="analysis-content">
            {aiAnalysis.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {alternativeSchedules.length > 0 && (
        <div className="alternative-schedules">
          <h3>🔄 Alternative Schedules</h3>
          <div className="alternatives-list">
            {alternativeSchedules.slice(0, 3).map((schedule, i) => (
              <div key={schedule.id} className="alternative-item">
                <div className="alt-header">
                  <span>Option {i + 2}</span>
                  <span className="alt-score">Score: {schedule.score}/100</span>
                </div>
                <div className="alt-summary">
                  {schedule.sections.length} sections, {schedule.totalCredits} credits
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
