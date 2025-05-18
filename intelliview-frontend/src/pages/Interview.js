import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import interviewService, { INTERVIEW_PHASES } from '../services/interviewService';
import { logNetworkInfo } from '../utils/networkUtils';
import { checkAndFixInterviewState } from '../utils/resetInterviewStorage';
import { MAIN_API_BASE_URL } from '../config/environment';
import useSaveInterviewHistory from '../hooks/useSaveInterviewHistory';
import saveQuestionAnswer from '../hooks/useSaveQuestionAnswer';
import '../styles/Interview.css';

// Helper function to completely reset all interview-related state
const resetAllInterviewState = () => {
  console.log('COMPLETE RESET: Clearing all interview-related localStorage items');
  
  // Clear interview progress
  localStorage.removeItem('interviewProgress');
  
  // Clear any cached phase information
  localStorage.removeItem('currentInterviewPhase');
  
  // Reset the interview service state
  interviewService.clearProgress();
  
  // Force interviewService to have empty state
  interviewService.interviewData = {
    candidateName: '',
    role: '',
    techStack: [],
    questions: [],
    currentPhase: '',
    resumeData: null,
    scores: {}
  };
};

const Interview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [interviewData, setInterviewData] = useState(null);
  const [summaryReport, setSummaryReport] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ main: null, llm: null });
  const [showResetMessage, setShowResetMessage] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    checkingConnection: false,
    loadingFirstQuestion: false
  });
  
  // Move the hook call to the component level
  useSaveInterviewHistory(interviewData?.questions, interviewComplete);
  
  useEffect(() => {
    // First check for any inconsistent state that needs fixing
    const wasFixed = checkAndFixInterviewState();
    if (wasFixed) {
      console.log('Inconsistent interview state detected and fixed. Page will refresh soon.');
      return; // Stop initialization since page will reload
    }
    
    // Check if we've just reset the interview
    const hasReset = localStorage.getItem('interviewJustReset');
    if (hasReset === 'true') {
      setShowResetMessage(true);
      // Clear the flag after displaying the message
      localStorage.removeItem('interviewJustReset');
      // Hide the message after 5 seconds
      setTimeout(() => setShowResetMessage(false), 5000);
    }
    
    // Check network connections
    const checkConnections = async () => {
      console.log("Checking network connections...");
      setNetworkStatus(prev => ({ ...prev, checkingConnection: true }));
      
      const networkInfo = await logNetworkInfo();
      setConnectionStatus({
        main: networkInfo.mainServerReachable,
        llm: networkInfo.llmServiceReachable
      });
      
      setNetworkStatus(prev => ({ ...prev, checkingConnection: false }));
      
      if (!networkInfo.llmServiceReachable) {
        console.error("LLM service is not reachable. Will use fallback questions.");
      }
    };
    
    checkConnections();
    
    // Initialize or resume interview
    const initializeInterview = async () => {
      setLoading(true);
      
      // FIRST: Always perform a complete reset to ensure clean state
      resetAllInterviewState();
      console.log('After reset - interviewService data:', interviewService.interviewData);
      
      // Get resume data from location state (passed from Home)
      let stateData = location.state;
      
      if (!stateData?.resumeData) {
        // Check if we have resume data in localStorage as fallback
        const savedResumeAnalysis = localStorage.getItem('resumeAnalysis');
        const savedResumeDetails = localStorage.getItem('resumeDetails');
        
        if (savedResumeAnalysis && savedResumeDetails) {
          try {
            stateData = {
              resumeData: JSON.parse(savedResumeAnalysis),
              resumeFile: JSON.parse(savedResumeDetails)
            };
            console.log('Resume data loaded from localStorage');
          } catch (err) {
            console.error('Error parsing saved resume data:', err);
            // If we can't load resume data, redirect back to home
            navigate('/');
            return;
          }
        } else {
          // No resume data found, redirect back to home
          console.error('No resume data found. Please upload your resume first.');
          navigate('/');
          return;
        }
      }
      
      // Initialize the interview service with resume data
      const newInterviewData = interviewService.initInterview({
        candidateName: stateData.resumeData.personal_info?.name || 'Candidate',
        role: 'Software Developer', // You could set this dynamically based on resume or user input
        techStack: extractTechStackFromResume(stateData.resumeData),
        resumeData: stateData.resumeData
      });
      
      // FORCE the current phase to be empty initially
      interviewService.interviewData.currentPhase = '';
      interviewService.interviewData.questions = [];

      setInterviewData({
        ...newInterviewData,
        currentPhase: '',
        questions: []
      });

      try {
        // Force the first question to be the introduction question by using moveToNextPhase
        // which will select the introduction phase since currentPhase is empty
        console.log('Generating first question (should be introduction)...');
        
        setNetworkStatus(prev => ({ ...prev, loadingFirstQuestion: true }));
        const firstQuestion = await interviewService.moveToNextPhase();
        setNetworkStatus(prev => ({ ...prev, loadingFirstQuestion: false }));
        
        console.log('Got first question:', firstQuestion);
        
        if (firstQuestion) {
          setCurrentQuestion(firstQuestion);
          
          // Update the interview data in state
          const updatedInterviewData = interviewService.getInterviewData();
          setInterviewData(updatedInterviewData);
          
          console.log('Updated interview data:', updatedInterviewData);
          console.log('Current phase after initialization:', updatedInterviewData.currentPhase);
          
          // Verify the phase is set to introduction
          if (updatedInterviewData.currentPhase !== INTERVIEW_PHASES.INTRODUCTION) {
            console.error('Phase not set correctly, forcing to INTRODUCTION');
            interviewService.interviewData.currentPhase = INTERVIEW_PHASES.INTRODUCTION;
            setInterviewData({
              ...updatedInterviewData,
              currentPhase: INTERVIEW_PHASES.INTRODUCTION
            });
          }
          
          // Save progress AFTER everything is set up correctly
          interviewService.saveProgress();
        } else {
          console.error('Failed to get first question');
        }
      } catch (error) {
        console.error('Error initializing interview:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeInterview();
  }, []);
  
  // Helper function to extract tech stack from resume
  const extractTechStackFromResume = (resumeData) => {
    const techStack = [];
    
    // Extract from skills
    if (resumeData.skills && Array.isArray(resumeData.skills)) {
      techStack.push(...resumeData.skills.slice(0, 5));
    }
    
    // Extract from projects
    if (resumeData.projects && Array.isArray(resumeData.projects)) {
      resumeData.projects.forEach(project => {
        if (project.technologies) {
          const techs = Array.isArray(project.technologies) 
            ? project.technologies 
            : project.technologies.split(',').map(t => t.trim());
          
          techs.forEach(tech => {
            if (!techStack.includes(tech)) {
              techStack.push(tech);
            }
          });
        }
      });
    }
    
    // If we still don't have enough technologies, add some defaults
    if (techStack.length < 3) {
      const defaults = ['JavaScript', 'React', 'Python', 'Java', 'Node.js'];
      defaults.forEach(tech => {
        if (!techStack.includes(tech)) {
          techStack.push(tech);
        }
      });
    }
    
    return techStack.slice(0, 8); // Limit to 8 technologies
  };

  const startNextPhase = async () => {
    setLoading(true);
    
    try {
      console.log('Starting next phase...');
      const question = await interviewService.moveToNextPhase();
      
      if (question) {
        console.log('Got new question:', question);
        setCurrentQuestion(question);
        
        // Save progress
        interviewService.saveProgress();
        
        // Update interview data
        setInterviewData(interviewService.getInterviewData());
      } else if (interviewService.getInterviewData().currentPhase === INTERVIEW_PHASES.SUMMARY) {
        console.log('Reached summary phase');
        // We've reached the summary phase
        setSummaryReport(interviewService.getInterviewData().summaryReport);
        setInterviewComplete(true);
      }
    } catch (error) {
      console.error('Error starting next phase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
  };

  const submitAnswer = async () => {
    if (!answer.trim() || answering) return;
    
    setAnswering(true);
    try {
      // Save the answer
      currentQuestion.answer = answer;
      
      // Update in interview service
      const currentQuestions = interviewService.getInterviewData().questions;
      currentQuestions[currentQuestions.length - 1].answer = answer;
      
      // Save progress
      interviewService.saveProgress();
      
      // Move to evaluation step
      setEvaluating(true);
      setAnswering(false);
      
      // Automatically call evaluateAnswer after submitting
      setTimeout(() => {
        evaluateAnswer();
      }, 500); // Small delay for better user experience
    } catch (error) {
      console.error('Error saving answer:', error);
      setAnswering(false);
    }
  };

  const evaluateAnswer = async () => {
    if (evaluating) return;
    
    setEvaluating(true);
    try {
      // Evaluate the answer
      const evaluation = await interviewService.evaluateAnswer(
        currentQuestion.type,
        currentQuestion.text,
        answer
      );
      
      // Set feedback
      setFeedback(evaluation);
      
      // Save progress
      interviewService.saveProgress();
      
      // Update interview data
      setInterviewData(interviewService.getInterviewData());
      
      // Save the question-answer data to the backend
      const sessionId = localStorage.getItem('interviewSessionId');
      const result = await saveQuestionAnswer(
        currentQuestion.text, 
        answer, 
        evaluation, 
        sessionId
      );
      
      // If we have a session ID, store it for future saves
      if (result.success && result.sessionId) {
        localStorage.setItem('interviewSessionId', result.sessionId);
      }
      
      setEvaluating(false);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    setAnswer('');
    setFeedback(null);
    setEvaluating(false);
    startNextPhase();
  };

  const renderResumeDetails = () => {
    if (!interviewData || !interviewData.resumeData) return null;
    
    const resumeData = interviewData.resumeData;
    
    return (
      <div className="resume-preview">
        <h3>Interview based on your resume:</h3>
        <div className="resume-content">
          {resumeData.personal_info?.name && (
            <p><strong>Name:</strong> {resumeData.personal_info.name}</p>
          )}
          
          {resumeData.education?.length > 0 && (
            <p><strong>Education:</strong> {resumeData.education[0].institution}</p>
          )}
          
          {resumeData.experience?.length > 0 && (
            <p><strong>Experience:</strong> {resumeData.experience[0].position} at {resumeData.experience[0].company}</p>
          )}
          
          {resumeData.skills?.length > 0 && (
            <p><strong>Skills:</strong> {resumeData.skills.slice(0, 5).join(', ')}</p>
          )}
        </div>
      </div>
    );
  };

  // Add a reset message component
  const renderResetMessage = () => {
    if (!showResetMessage) return null;
    
    return (
      <div className="reset-message">
        <p>✅ Interview has been reset! You'll now start at Question 1 (Introduction).</p>
      </div>
    );
  };

  const renderIntroduction = () => {
    return (
      <div className="interview-intro">
        <h1>AI-Powered Interview Practice</h1>
        {showResetMessage && renderResetMessage()}
        
        {/* Network Status Indicators */}
        {networkStatus.checkingConnection && (
          <div className="network-status-message">
            <div className="loading-spinner small"></div>
            <p>Checking LLM service connection...</p>
          </div>
        )}
        
        {networkStatus.loadingFirstQuestion && (
          <div className="network-status-message">
            <div className="loading-spinner small"></div>
            <p>Loading introduction question...</p>
          </div>
        )}
        
        {!connectionStatus.llm && (
          <div className="warning-message">
            <p>⚠️ LLM service is disconnected. Using fallback questions and responses.</p>
          </div>
        )}
        
        <p>
          Welcome to your personalized interview practice session. 
          You'll be asked a series of questions based on your resume and industry standards.
        </p>
        <p>
          Your answers will be evaluated in real-time to provide feedback and help you improve.
        </p>
        
        {interviewData && (
          <div className="interview-settings">
            <p><strong>Candidate:</strong> {interviewData.candidateName}</p>
            <p><strong>Role:</strong> {interviewData.role}</p>
            <p><strong>Technology Stack:</strong> {interviewData.techStack.join(', ')}</p>
          </div>
        )}
        
        <div className="interview-actions">
          <button 
            className="start-button" 
            onClick={() => {
              const questions = interviewService.getInterviewData().questions;
              if (questions.length > 0) {
                setCurrentQuestion(questions[0]);
              }
            }}
            disabled={networkStatus.checkingConnection || networkStatus.loadingFirstQuestion}
          >
            {networkStatus.checkingConnection || networkStatus.loadingFirstQuestion ? 
              'Preparing Interview...' : 'Start Interview'}
          </button>
          
          <button 
            className="reset-button"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset the interview? This will start you over at Question 1.')) {
                resetAllInterviewState();
                // Set a flag for the next page load to show reset message
                localStorage.setItem('interviewJustReset', 'true');
                window.location.reload(); // Force a complete page refresh
              }
            }}
            disabled={networkStatus.checkingConnection || networkStatus.loadingFirstQuestion}
          >
            Reset Interview
          </button>
        </div>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!feedback) return null;
    
    return (
      <div className="feedback-container">
        <h3>Feedback on Your Answer</h3>
        <div className="feedback-score">
          <div className="score-circle">
            <span>{feedback.score}</span>
            <small>/10</small>
          </div>
        </div>
        <div className="feedback-text">
          <p>{feedback.feedback}</p>
          
          {/* Display strengths */}
          {feedback.strengths && feedback.strengths.length > 0 && (
            <div className="feedback-strengths">
              <h4>Strengths:</h4>
              <ul>
                {feedback.strengths.map((strength, index) => (
                  <li key={`strength-${index}`}>{strength}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Display weaknesses */}
          {feedback.weaknesses && feedback.weaknesses.length > 0 && (
            <div className="feedback-weaknesses">
              <h4>Areas to Improve:</h4>
              <ul>
                {feedback.weaknesses.map((weakness, index) => (
                  <li key={`weakness-${index}`}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Display suggestions */}
          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div className="feedback-suggestions">
              <h4>Suggestions:</h4>
              <ul>
                {feedback.suggestions.map((suggestion, index) => (
                  <li key={`suggestion-${index}`}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
          
          {feedback.areas_to_probe && (
            <div className="probe-areas">
              <h4>Follow-up Questions to Consider:</h4>
              <p>{feedback.areas_to_probe}</p>
            </div>
          )}
        </div>
        <button className="next-button" onClick={nextQuestion}>
          Next Question
        </button>
      </div>
    );
  };

  const renderSummary = () => {
    if (!summaryReport) return null;
    
    // Use optional chaining and provide fallback values for potentially undefined properties
    const percentage = summaryReport.percentage || 0;
    const total_score = summaryReport.total_score || 0;
    const max_possible = summaryReport.max_possible || 10;
    const assessment = summaryReport.assessment || {};
    
    // Create safe access to potentially undefined properties
    const recommendation = assessment.recommendation || 'No recommendation available';
    const overall_impression = assessment.overall_impression || 'No overall impression available';
    const technical_strengths = assessment.technical_strengths || [];
    const areas_for_improvement = assessment.areas_for_improvement || [];
    
    return (
      <div className="summary-container">
        <h1>Interview Results</h1>
        
        <div className="score-overview">
          <div className="final-score">
            <div className="score-circle large">
              <span>{Math.round(percentage)}%</span>
            </div>
            <p>Score: {total_score}/{max_possible}</p>
          </div>
          
          <div className="recommendation">
            <h3>Recommendation:</h3>
            <p className={`recommendation-${recommendation.toLowerCase().replace(/\s+/g, '-')}`}>
              {recommendation}
            </p>
          </div>
        </div>
        
        <div className="assessment-details">
          <h3>Overall Impression:</h3>
          <p>{overall_impression}</p>
          
          <h3>Technical Strengths:</h3>
          {technical_strengths.length > 0 ? (
            <ul>
              {technical_strengths.map((strength, index) => (
                <li key={index}>{strength}</li>
              ))}
            </ul>
          ) : (
            <p>No specific strengths identified.</p>
          )}
          
          <h3>Areas for Improvement:</h3>
          {areas_for_improvement.length > 0 ? (
            <ul>
              {areas_for_improvement.map((area, index) => (
                <li key={index}>{area}</li>
              ))}
            </ul>
          ) : (
            <p>No specific areas for improvement identified.</p>
          )}
        </div>

        {/* Detailed question review section */}
        <div className="detailed-review">
          <h2>Detailed Question Review</h2>
          
          {interviewData && interviewData.questions && interviewData.questions.length > 0 ? (
            interviewData.questions.map((question, index) => (
              <div className="question-review-item" key={index}>
                <div className="question-review-header">
                  <span className="question-review-badge">{getQuestionTypeBadgeText(question.type)}</span>
                  <span className="question-review-score">
                    Score: <strong>{question.evaluation?.score || 'N/A'}</strong>/10
                  </span>
                </div>
                
                <div className="question-review-content">
                  <h3>Question {index + 1}:</h3>
                  <p className="question-review-text">{question.text}</p>
                  
                  <h4>Your Answer:</h4>
                  <div className="answer-review-text">
                    <p>{question.answer || 'No answer provided'}</p>
                  </div>
                  
                  {question.evaluation ? (
                    <div className="feedback-review">
                      <h4>Feedback:</h4>
                      <p>{question.evaluation.feedback || 'No feedback available'}</p>
                      
                      {question.evaluation.strengths && question.evaluation.strengths.length > 0 ? (
                        <div className="strengths-review">
                          <h5>Strengths:</h5>
                          <ul>
                            {question.evaluation.strengths.map((strength, idx) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      
                      {question.evaluation.weaknesses && question.evaluation.weaknesses.length > 0 ? (
                        <div className="weaknesses-review">
                          <h5>Areas to Improve:</h5>
                          <ul>
                            {question.evaluation.weaknesses.map((weakness, idx) => (
                              <li key={idx}>{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="feedback-review">
                      <p>No evaluation available for this question.</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="no-questions-message">No questions available for review.</p>
          )}
        </div>
        
        <div className="summary-actions">
          <button 
            className="home-button"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
          <button 
            className="restart-button"
            onClick={() => {
              interviewService.clearProgress();
              navigate('/');
            }}
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  };

  const getQuestionTypeBadgeText = (type) => {
    switch(type) {
      case INTERVIEW_PHASES.INTRODUCTION: return 'INTRODUCTION';
      case INTERVIEW_PHASES.PROJECT: return 'PROJECT';
      case INTERVIEW_PHASES.TECHNICAL: return 'TECHNICAL';
      case INTERVIEW_PHASES.CS_FUNDAMENTALS: return 'CS FUNDAMENTALS';
      case INTERVIEW_PHASES.DSA: return 'DATA STRUCTURES & ALGORITHMS';
      case INTERVIEW_PHASES.FOLLOWUP: return 'FOLLOW-UP';
      case INTERVIEW_PHASES.SUMMARY: return 'SUMMARY';
      default: return type?.toUpperCase() || '';
    }
  };

  // Add a debug message component
  const renderDebugInfo = () => {
    // Only render in development or when a special debug flag is enabled
    const isDebugMode = process.env.NODE_ENV === 'development' || localStorage.getItem('enableDebug') === 'true';
    if (!isDebugMode) return null;
    
    const toggleDebugMode = () => {
      const current = localStorage.getItem('enableDebug');
      if (current === 'true') {
        localStorage.removeItem('enableDebug');
        alert('Debug mode disabled. Refresh to see changes.');
      } else {
        localStorage.setItem('enableDebug', 'true');
        alert('Debug mode enabled.');
      }
    };
    
    return (
      <div className="debug-info">
        <h4>Debug Information</h4>
        <p>Current Phase: {interviewData?.currentPhase || 'none'}</p>
        <p>Question Count: {interviewData?.questions?.length || 0}</p>
        <p>Current Question Type: {currentQuestion?.type || 'none'}</p>
        <p>LLM Service: {connectionStatus.llm ? '✅ Connected' : '❌ Disconnected'}</p>
        <div className="debug-buttons">
          <button 
            onClick={() => {
              console.log('Debug - Interview Data:', interviewService.getInterviewData());
              console.log('Debug - Current Question:', currentQuestion);
              alert('Debug info logged to console');
            }}
          >
            Log Debug Info
          </button>
          <button 
            onClick={() => {
              resetAllInterviewState();
              window.location.reload();
            }}
          >
            Reset & Reload
          </button>
          <button onClick={toggleDebugMode}>
            {localStorage.getItem('enableDebug') === 'true' ? 'Disable Debug Mode' : 'Enable Debug Mode'}
          </button>
        </div>
      </div>
    );
  };

  if (loading && !currentQuestion) {
    return (
      <div className="interview-container">
        <div className="loading-container">
          <h2>Loading your interview...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (interviewComplete) {
    return (
      <div className="interview-container">
        {renderSummary()}
      </div>
    );
  }

  if (!currentQuestion && interviewData) {
    return (
      <div className="interview-container">
        {renderIntroduction()}
      </div>
    );
  }

  return (
    <div className="interview-container">
      {showResetMessage && renderResetMessage()}
      
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Preparing your interview...</p>
        </div>
      ) : interviewComplete ? (
        renderSummary()
      ) : !currentQuestion ? (
        renderIntroduction()
      ) : (
        <div className="question-container">
          {renderResumeDetails()}
          
          <div className="question-header">
            <span className="question-badge">{getQuestionTypeBadgeText(currentQuestion.type)}</span>
            <span className="question-number">
              Question {
                // Ensure we always show the first question for the introduction phase
                currentQuestion.type === INTERVIEW_PHASES.INTRODUCTION ? 1 : 
                currentQuestion.type === INTERVIEW_PHASES.PROJECT ? 2 :
                currentQuestion.type === INTERVIEW_PHASES.TECHNICAL ? 3 :
                currentQuestion.type === INTERVIEW_PHASES.CS_FUNDAMENTALS ? 4 :
                currentQuestion.type === INTERVIEW_PHASES.DSA ? 5 :
                currentQuestion.type === INTERVIEW_PHASES.FOLLOWUP ? 6 : 7
              } of 7
            </span>
          </div>
          
          <div className="question">
            <h2>{currentQuestion.text}</h2>
          </div>
          
          {feedback ? (
            renderFeedback()
          ) : (
            <div className="answer-container">
              <textarea
                className="answer-input"
                placeholder="Type your answer here..."
                value={answer}
                onChange={handleAnswerChange}
                disabled={answering}
              ></textarea>
              
              <button 
                className="submit-button"
                onClick={submitAnswer}
                disabled={!answer.trim() || answering}
              >
                {answering ? 'Submitting...' : 'Submit'}
              </button>
              
              {evaluating && (
                <div className="evaluating-indicator">
                  <div className="loading-spinner small"></div>
                  <p>Evaluating your answer...</p>
                </div>
              )}
            </div>
          )}
          
          {!connectionStatus.llm && (
            <div className="warning-message">
              <p>⚠️ LLM service is disconnected. Using fallback questions and responses.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Render debug info */}
      {renderDebugInfo()}
    </div>
  );
};

export default Interview;
