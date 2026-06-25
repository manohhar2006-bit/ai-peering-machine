import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Brain,
  Scale,
  Award,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Eye,
  Loader2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface AILearningAssistantProps {
  doubt: any;
  aiAnalysis: any;
  answers: any[];
  hints: any[];
  hintLoading: boolean;
  isAsker: boolean;
  handleRequestHint: () => Promise<void>;
  isEscalated: boolean;
  escalationReason: string | null;
}

export const AILearningAssistant: React.FC<AILearningAssistantProps> = ({
  doubt,
  aiAnalysis,
  answers,
  hints,
  hintLoading,
  isAsker,
  handleRequestHint,
  isEscalated,
  escalationReason
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'referee' | 'evaluator' | 'escalation'>('coach');
  const [showConcept, setShowConcept] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>('');

  // API State
  const [refereeData, setRefereeData] = useState<any>(null);
  const [refereeLoading, setRefereeLoading] = useState(false);
  const [evaluatingAnswerId, setEvaluatingAnswerId] = useState<string | null>(null);
  const [localEscalated, setLocalEscalated] = useState(isEscalated);
  const [localEscalationReason, setLocalEscalationReason] = useState(escalationReason);
  const [escalationPriority, setEscalationPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    if (answers.length > 0 && !selectedAnswerId) {
      setSelectedAnswerId(answers[0]._id);
    }
  }, [answers, selectedAnswerId]);

  // Load Referee Data
  useEffect(() => {
    if (activeTab === 'referee' && answers.length > 0) {
      const fetchReferee = async () => {
        setRefereeLoading(true);
        try {
          const response = await axios.post('http://localhost:5000/api/ai/referee', { doubtId: doubt._id });
          setRefereeData(response.data);
        } catch (err) {
          console.error('Error fetching AI referee report:', err);
        } finally {
          setRefereeLoading(false);
        }
      };
      fetchReferee();
    }
  }, [activeTab, answers.length, doubt._id]);

  // Dynamic values based on doubt context
  const getSubjectConcept = () => {
    const topic = doubt?.topic?.toLowerCase() || '';
    if (topic.includes('limit') || topic.includes('calculus')) {
      return {
        concept: "Limits describe how a function behaves near a point, rather than at that point. Geometrically, it represents the value a curve approaches as x gets infinitesimally close.",
        example: "Example: f(x) = (x^2 - 1)/(x - 1). At x = 1, it's 0/0 (undefined). But the limit as x -> 1 is x+1 = 2."
      };
    }
    if (topic.includes('join') || topic.includes('database')) {
      return {
        concept: "Relational Joins combine columns from one or more tables. LEFT JOIN fetches all records from table A and matches from table B; missing rows will have NULL.",
        example: "Example: SELECT * FROM Users LEFT JOIN Orders ON Users.id = Orders.userId. Users with no orders will still appear in results."
      };
    }
    if (topic.includes('friction') || topic.includes('mechanics')) {
      return {
        concept: "Static friction is the friction force that prevents an object from starting to slide. Kinetic friction is the sliding resistance. Microscopic welds form between peaks on contacting surfaces.",
        example: "Example: Pushing a heavy wood chest. It requires more effort to start sliding (static threshold) than to keep it sliding."
      };
    }
    return {
      concept: `This query addresses conceptual points regarding ${doubt?.topic || 'General study'}. Review standard formulations.`,
      example: "No template example loaded. Try checking textbook definitions for typical derivations."
    };
  };

  const currentConcept = getSubjectConcept();

  // Find the highest rated answer
  const getBestAnswer = () => {
    if (answers.length === 0) return null;
    const sorted = [...answers].sort((a, b) => (b.aiEvaluation?.score || 0) - (a.aiEvaluation?.score || 0));
    return sorted[0];
  };

  const bestAnswer = getBestAnswer();

  // Selected Answer for Evaluator Tab
  const activeAnswer = answers.find(a => a._id === selectedAnswerId) || bestAnswer;

  // Escalation criteria
  const isInterventionRecommended = () => {
    if (doubt?.difficulty === 'hard') return true;
    if (localEscalated) return true;
    if (answers.length > 2) {
      const scores = answers.map(a => a.aiEvaluation?.score || 0);
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      if (max - min > 30) return true;
    }
    return false;
  };

  const aiConfidence = () => {
    if (doubt?.difficulty === 'hard') return 45;
    if (doubt?.difficulty === 'medium') return 75;
    return 95;
  };

  const handleEscalateClick = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/ai/escalate', {
        doubtId: doubt._id,
        reason: 'low-confidence'
      });
      setLocalEscalated(true);
      setLocalEscalationReason('low-confidence');
      setEscalationPriority(response.data.priority);
      alert(`Doubt escalated successfully to faculty queue! Priority: ${response.data.priority.toUpperCase()}`);
    } catch (err) {
      console.error('Escalation failed:', err);
      alert('Failed to escalate doubt');
    }
  };

  const handleEvaluateAnswer = async (ans: any) => {
    setEvaluatingAnswerId(ans._id);
    try {
      const response = await axios.post('http://localhost:5000/api/ai/evaluate-answer', {
        doubtId: doubt._id,
        answerContent: ans.content,
        answerId: ans._id
      });
      ans.aiEvaluation = response.data;
      // Refresh selected state
      setSelectedAnswerId('');
      setTimeout(() => setSelectedAnswerId(ans._id), 10);
    } catch (err) {
      console.error('Answer evaluation failed:', err);
      alert('Failed to evaluate answer');
    } finally {
      setEvaluatingAnswerId(null);
    }
  };

  const tabs = [
    { id: 'coach', label: 'Coach', icon: Brain },
    { id: 'referee', label: 'Referee', icon: Scale },
    { id: 'evaluator', label: 'Evaluator', icon: Award },
    { id: 'escalation', label: 'Escalation', icon: AlertTriangle }
  ];

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 flex flex-col space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
        <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <Brain className="h-4.5 w-4.5 animate-float" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">AI Learning Assistant</h3>
      </div>

      {/* Segmented Controls / Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-2xl dark:bg-[#0F172A]">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                // Clear concept/example expansions
                setShowConcept(false);
                setShowExample(false);
              }}
              className={`py-2 text-[10px] font-bold rounded-xl flex flex-col items-center justify-center space-y-1 transition-all ${
                isActive
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-455 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Contents */}
      <div className="flex-1 min-h-[300px]">
        {/* COACH TAB */}
        {activeTab === 'coach' && (
          <div className="space-y-5">
            <div className="bg-slate-55 p-4 rounded-2xl border border-slate-100 text-xs dark:bg-[#0F172A] dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 block dark:text-slate-300">Topic Analysis:</span>
              <p className="text-slate-500 dark:text-slate-405 leading-relaxed">
                {aiAnalysis?.explanation || 'This doubt query addresses core mechanics. Solve steps geometrically or via relational calculus.'}
              </p>
            </div>

            {/* AI Hint Panel */}
            {hints.length > 0 && (
              <div className="space-y-2">
                {hints.map((hint, idx) => (
                  <div key={idx} className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-100/50 text-xs dark:bg-amber-950/15 dark:border-amber-900/40 text-slate-700 dark:text-slate-350">
                    <span className="font-extrabold text-amber-700 block dark:text-amber-450 mb-0.5">
                      Hint #{idx + 1} ({idx === 0 ? 'Small clue' : idx === 1 ? 'Medium clue' : idx === 2 ? 'Strong clue' : 'Near-complete guidance'}):
                    </span>
                    {hint.hintContent}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {isAsker && doubt.status !== 'resolved' && hints.length < 4 && (
                <button
                  onClick={handleRequestHint}
                  disabled={hintLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-amber-500 text-white font-bold py-2.5 text-xs hover:bg-amber-600 transition-all shadow-sm"
                >
                  {hintLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4" />
                      <span>Reveal Hint #{hints.length + 1}</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowConcept(!showConcept);
                  setShowExample(false);
                }}
                className="w-full border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 flex items-center justify-center space-x-2"
              >
                <BookOpen className="h-4 w-4" />
                <span>{showConcept ? 'Hide Concept Explanation' : 'Explain Concept'}</span>
              </button>

              {showConcept && (
                <div className="bg-brand-50/40 p-4 rounded-xl border border-brand-100 text-xs text-slate-600 dark:bg-brand-950/10 dark:border-brand-900/30 dark:text-slate-350 leading-relaxed">
                  {currentConcept.concept}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowExample(!showExample);
                  setShowConcept(false);
                }}
                className="w-full border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-xl text-xs hover:bg-slate-50 transition-all dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 flex items-center justify-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>{showExample ? 'Hide Similar Example' : 'Show Similar Example'}</span>
              </button>

              {showExample && (
                <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-100 text-xs text-slate-600 dark:bg-teal-950/10 dark:border-teal-900/30 dark:text-slate-350 leading-relaxed">
                  {currentConcept.example}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REFEREE TAB */}
        {activeTab === 'referee' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Answer Comparison</h4>
            
            {answers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl dark:bg-[#0F172A]">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <span>No solutions submitted to compare yet.</span>
              </div>
            ) : refereeLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <span className="text-xs text-slate-405">Comparing solver submissions...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Answers and scores list */}
                <div className="space-y-2">
                  {answers.map((ans) => {
                    const score = ans.aiEvaluation?.score || 0;
                    const isBest = refereeData?.bestAnswer && refereeData.bestAnswer.solverName === ans.solverId?.name;

                    return (
                      <div
                        key={ans._id}
                        className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                          isBest
                            ? 'border-emerald-250 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                            : 'border-slate-200 bg-white dark:bg-[#0F172A] dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-extrabold text-slate-700 dark:text-slate-200 block">
                            {ans.solverId?.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isBest ? '⭐ Highlighted Best Answer' : 'Peer respondent'}
                          </span>
                        </div>
                        <span className={`font-black text-sm ${score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {score}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Best Answer Highlight */}
                {refereeData && (
                  <div className="bg-brand-50/40 p-4 rounded-xl border border-brand-100 text-xs space-y-2 dark:bg-brand-950/10 dark:border-brand-900/30">
                    <span className="font-extrabold text-brand-700 block dark:text-brand-400">
                      AI Best Answer Selection (Confidence: {refereeData.confidenceScore}%):
                    </span>
                    <p className="text-slate-600 dark:text-slate-350 leading-relaxed">
                      {refereeData.reasoning}
                    </p>
                    <div className="text-[10px] text-slate-400 border-t border-brand-100 dark:border-brand-900/30 pt-2">
                      <span className="font-bold text-slate-500">Missing Concept identified:</span> {refereeData.missingConcept}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* EVALUATOR TAB */}
        {activeTab === 'evaluator' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Solution Quality Analyzer</h4>

            {answers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl dark:bg-[#0F172A]">
                <Award className="h-8 w-8 mx-auto mb-2 text-slate-355" />
                <span>No solutions posted. Write an answer on the left to activate grading metrics.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dropdown to select answer */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Answer</label>
                  <select
                    value={selectedAnswerId}
                    onChange={(e) => setSelectedAnswerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-655 dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-300 focus:outline-none"
                  >
                    {answers.map((ans) => (
                      <option key={ans._id} value={ans._id}>
                        {ans.solverId?.name} ({ans.aiEvaluation?.score || 'No score'}%)
                      </option>
                    ))}
                  </select>
                </div>

                {activeAnswer ? (
                  activeAnswer.aiEvaluation ? (
                    <div className="bg-slate-55/30 p-4 rounded-xl border border-slate-100 space-y-4 dark:bg-[#0F172A] dark:border-slate-800 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">AI Quality Scorecard</span>
                        <span className={`text-base font-black ${activeAnswer.aiEvaluation.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {activeAnswer.aiEvaluation.score}/100
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-455 mb-0.5">
                            <span>Correctness</span>
                            <span>{activeAnswer.aiEvaluation.correctness}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-550 rounded-full" style={{ width: `${activeAnswer.aiEvaluation.correctness}%`, backgroundColor: '#10b981' }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-455 mb-0.5">
                            <span>Clarity</span>
                            <span>{activeAnswer.aiEvaluation.clarity}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${activeAnswer.aiEvaluation.clarity}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-455 mb-0.5">
                            <span>Completeness</span>
                            <span>{activeAnswer.aiEvaluation.completeness || 80}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${activeAnswer.aiEvaluation.completeness || 80}%` }} />
                          </div>
                        </div>
                      </div>

                      <p className="text-xs italic text-slate-500 leading-relaxed dark:text-slate-400">
                        <strong className="not-italic text-slate-650 dark:text-slate-350">AI Critique:</strong> {activeAnswer.aiEvaluation.feedback}
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100 dark:bg-[#0F172A] dark:border-slate-800 text-xs space-y-3">
                      <p className="text-slate-400">This answer does not have AI evaluation details yet.</p>
                      <button
                        onClick={() => handleEvaluateAnswer(activeAnswer)}
                        disabled={evaluatingAnswerId === activeAnswer._id}
                        className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 shadow-sm transition-all flex items-center justify-center mx-auto space-x-1.5"
                      >
                        {evaluatingAnswerId === activeAnswer._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Award className="h-4 w-4" />
                            <span>Evaluate Solution now</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ESCALATION TAB */}
        {activeTab === 'escalation' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Faculty Escalation Monitor</h4>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-3 dark:bg-[#0F172A] dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-450">Difficulty Level:</span>
                <span className="font-bold text-slate-700 capitalize dark:text-slate-200">{doubt.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Peer Solvers Active:</span>
                <span className="font-bold text-slate-700 dark:text-slate-205">{answers.length} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">AI Confidence:</span>
                <span className="font-bold text-slate-750 dark:text-slate-205">{aiConfidence()}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Teacher Needed:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  isInterventionRecommended()
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/20'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-955/20'
                }`}>
                  {isInterventionRecommended() ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Escalation alert badge */}
            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
              localEscalated
                ? 'border-red-200 bg-red-50/40 text-red-700 dark:bg-red-950/15 dark:border-red-900/30'
                : 'border-slate-200 bg-slate-50/50 text-slate-550 dark:bg-[#0F172A] dark:border-slate-800'
            }`}>
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <AlertTriangle className={`h-4.5 w-4.5 ${localEscalated ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                <span>Escalation Status: {localEscalated ? 'Flagged Awaiting Faculty' : 'Peer Resolution Mode'}</span>
              </div>
              {localEscalated ? (
                <div className="space-y-1">
                  <p>
                    This doubt thread has been escalated. Faculty has been notified because: {
                      localEscalationReason === 'timeout' ? 'No solver responded within the peer-routing window.' :
                      localEscalationReason === 'contradictory' ? 'Conflicting solver answers were detected.' :
                      'Difficulty is marked as Hard or AI evaluation confidence is low.'
                    }
                  </p>
                  <span className="font-bold text-[10px] uppercase text-red-650 block pt-1">
                    Escalation Priority: {escalationPriority.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>Students are actively discussing this query. Auto-escalation checks will trigger if ratings disagree or average scores remain low.</p>
                  
                  {isAsker && doubt.status !== 'resolved' && (
                    <button
                      onClick={handleEscalateClick}
                      className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-xs transition-all shadow-sm"
                    >
                      Manually Escalate to Teacher
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
