import { useState, useCallback } from 'react';
import { CSVUpload } from './components/CSVUpload';
import { CourseList } from './components/CourseList';
import { PreferencesForm } from './components/PreferencesForm';
import { ScheduleView } from './components/ScheduleView';
import { TradeBoard } from './components/TradeBoard';
import { useCourses } from './hooks/useCourses';
import { usePreferences } from './hooks/usePreferences';
import { useSelections } from './hooks/useSelections';
import { useTrading } from './hooks/useTrading';
import { optimizeWithLLM, isLLMAvailable } from './services/llm';
import type { Schedule, OptimizationResult } from './types';
import './App.css';

type Tab = 'import' | 'courses' | 'preferences' | 'schedule' | 'trading';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);

  const coursesHook = useCourses();
  const preferencesHook = usePreferences();
  const selectionsHook = useSelections(
    coursesHook.courses,
    coursesHook.sections,
    preferencesHook.preferences
  );
  const tradingHook = useTrading();

  const handleOptimize = useCallback(async () => {
    const selectedSections = selectionsHook.getSelectedSections();
    
    if (selectedSections.length === 0) {
      alert('Please select at least one course section first.');
      return;
    }

    setIsOptimizing(true);

    if (llmAvailable === null) {
      const available = await isLLMAvailable();
      setLlmAvailable(available);
    }

    try {
      const currentSchedule: Schedule = {
        id: 'current',
        name: 'Current Selection',
        sections: selectedSections,
        totalCredits: selectedSections.reduce((sum, s) => {
          const course = coursesHook.courses.find(c => c.id === s.courseId);
          return sum + (course?.credits || 3);
        }, 0),
        score: 0,
        conflicts: [],
      };

      if (llmAvailable) {
        const result = await optimizeWithLLM([currentSchedule], preferencesHook.preferences);
        setOptimizationResult(result);
      } else {
        setOptimizationResult({
          schedules: [currentSchedule],
          bestSchedule: currentSchedule,
          aiAnalysis: 'LLM not available. Using default schedule.',
        });
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [selectionsHook, preferencesHook, coursesHook, llmAvailable]);

  const handleCreateUser = useCallback(async (displayName: string, email?: string) => {
    await tradingHook.createNewUser(displayName, email);
  }, [tradingHook]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎓 Course Hub</h1>
        <p>Import courses, optimize your schedule, and trade with other students</p>
      </header>

      <nav className="tab-navigation">
        <button
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          📥 Import
        </button>
        <button
          className={activeTab === 'courses' ? 'active' : ''}
          onClick={() => setActiveTab('courses')}
        >
          📚 Courses
        </button>
        <button
          className={activeTab === 'preferences' ? 'active' : ''}
          onClick={() => setActiveTab('preferences')}
        >
          ⚙️ Preferences
        </button>
        <button
          className={activeTab === 'schedule' ? 'active' : ''}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Schedule
        </button>
        <button
          className={activeTab === 'trading' ? 'active' : ''}
          onClick={() => setActiveTab('trading')}
        >
          🔄 Trading
        </button>
      </nav>

      <main className="app-content">
        {activeTab === 'import' && (
          <section className="tab-panel import-panel">
            <CSVUpload
              onUpload={coursesHook.loadCSV}
              errors={coursesHook.parseErrors}
              warnings={coursesHook.parseWarnings}
              isLoaded={coursesHook.isLoaded}
            />
            
            {coursesHook.isLoaded && (
              <div className="import-summary">
                <h3>📊 Import Summary</h3>
                <div className="summary-stats">
                  <div className="stat">
                    <span className="value">{coursesHook.courses.length}</span>
                    <span className="label">Courses</span>
                  </div>
                  <div className="stat">
                    <span className="value">{coursesHook.sections.length}</span>
                    <span className="label">Sections</span>
                  </div>
                  <div className="stat">
                    <span className="value">{coursesHook.getSubjectList().length}</span>
                    <span className="label">Subjects</span>
                  </div>
                </div>
                
                <button
                  className="action-btn primary"
                  onClick={() => setActiveTab('courses')}
                >
                  Browse Courses →
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'courses' && (
          <section className="tab-panel courses-panel">
            <CourseList
              courses={coursesHook.courses}
              sections={coursesHook.sections}
              selectedSections={selectionsHook.selectedSections}
              onSelectSection={selectionsHook.selectSection}
              onDeselectCourse={selectionsHook.deselectCourse}
            />
            
            {selectionsHook.selectedSections.size > 0 && (
              <div className="sticky-action">
                <span>
                  {selectionsHook.selectedSections.size} course{selectionsHook.selectedSections.size !== 1 ? 's' : ''} selected
                </span>
                <button 
                  className="action-btn primary"
                  onClick={() => setActiveTab('schedule')}
                >
                  View Schedule →
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'preferences' && (
          <section className="tab-panel preferences-panel">
            <PreferencesForm
              preferences={preferencesHook.preferences}
              onUpdate={preferencesHook.updatePreference}
            />
          </section>
        )}

        {activeTab === 'schedule' && (
          <section className="tab-panel schedule-panel">
            <div className="schedule-actions">
              <button
                className="action-btn primary"
                onClick={handleOptimize}
                disabled={isOptimizing || selectionsHook.selectedSections.size === 0}
              >
                {isOptimizing ? '⏳ Optimizing...' : '🧠 Optimize with AI'}
              </button>
              
              <button
                className="action-btn secondary"
                onClick={selectionsHook.clearAllSelections}
                disabled={selectionsHook.selectedSections.size === 0}
              >
                Clear Selection
              </button>
            </div>

            <ScheduleView
              currentSchedule={optimizationResult?.bestSchedule || selectionsHook.currentSchedule}
              alternativeSchedules={optimizationResult?.schedules.slice(1, 4) || selectionsHook.alternativeSchedules}
              aiAnalysis={optimizationResult?.aiAnalysis}
              error={optimizationResult?.error}
              isOptimizing={isOptimizing}
            />
          </section>
        )}

        {activeTab === 'trading' && (
          <section className="tab-panel trading-panel">
            <TradeBoard
              trades={tradingHook.trades}
              currentUser={tradingHook.currentUser}
              isLoading={tradingHook.isLoading}
              error={tradingHook.error}
              connectionStatus={tradingHook.connectionStatus}
              onCreateUser={handleCreateUser}
              onPostTrade={tradingHook.postTrade}
              onUpdateStatus={tradingHook.updateStatus}
              onDeleteTrade={tradingHook.removeTrade}
              onRefresh={tradingHook.refreshTrades}
              onLoadSample={tradingHook.loadSampleData}
            />
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Course Hub - Built with React, TypeScript & Vite</p>
        <div className="footer-links">
          <span>💾 Data stored locally</span>
          <span>•</span>
          <span>🌐 {tradingHook.connectionStatus.mode === 'online' ? 'Netlify DB' : 'Local Storage'}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;