import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../config/api';
import '../styles/Interview.css';

const Interview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [resumeData, setResumeData] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  
  useEffect(() => {
    // Get resume data from location state (passed from Home)
    const stateData = location.state;
    
    if (stateData?.resumeData) {
      setResumeData(stateData.resumeData);
      setResumeFile(stateData.resumeFile);
      console.log('Resume data loaded:', stateData.resumeData);
    } else {
      // Check if we have resume data in localStorage as fallback
      const savedResumeAnalysis = localStorage.getItem('resumeAnalysis');
      const savedResumeDetails = localStorage.getItem('resumeDetails');
      
      if (savedResumeAnalysis && savedResumeDetails) {
        try {
          setResumeData(JSON.parse(savedResumeAnalysis));
          setResumeFile(JSON.parse(savedResumeDetails));
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
    
    // Fetch interview questions when component mounts and resume data is available
    startInterview();
  }, []);

  const startInterview = async () => {
    setLoading(true);
    try {
      // Send resume data to backend to generate personalized questions
      const response = await api.post('/api/interview/start/', {
        resume_data: resumeData,
        resume_file: resumeFile
      });
      
      setQuestions(response.data.questions);
      setCurrentQuestion(response.data.questions[0]);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error starting interview:', error);
      
      // Fallback to static questions if API fails
      const mockQuestions = generateMockQuestions(resumeData);
      setQuestions(mockQuestions);
      setCurrentQuestion(mockQuestions[0]);
      setCurrentQuestionIndex(0);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock questions based on resume data for fallback
  const generateMockQuestions = (resumeData) => {
    const mockQuestions = [];
    
    // Add personal introduction question
    mockQuestions.push({
      id: 'intro-1',
      text: 'Tell me about yourself and your background.',
      type: 'personal'
    });
    
    // Add education questions if available
    if (resumeData?.education?.length > 0) {
      const education = resumeData.education[0];
      mockQuestions.push({
        id: 'edu-1',
        text: `I see you studied ${education.degree} at ${education.institution}. What key skills did you gain from this education?`,
        type: 'education'
      });
    }
    
    // Add experience questions if available
    if (resumeData?.experience?.length > 0) {
      const experience = resumeData.experience[0];
      mockQuestions.push({
        id: 'exp-1',
        text: `Tell me about your role as ${experience.position} at ${experience.company}. What were your main responsibilities?`,
        type: 'experience'
      });
      
      mockQuestions.push({
        id: 'exp-2',
        text: 'Describe a challenging situation you faced in your previous role and how you overcame it.',
        type: 'experience'
      });
    }
    
    // Add project questions if available
    if (resumeData?.projects?.length > 0) {
      const project = resumeData.projects[0];
      mockQuestions.push({
        id: 'proj-1',
        text: `I'm interested in your project "${project.name}". Can you explain your role and the technologies you used?`,
        type: 'project'
      });
    }
    
    // Add skills questions if available
    if (resumeData?.skills?.length > 0) {
      mockQuestions.push({
        id: 'skill-1',
        text: `I see you have experience with ${resumeData.skills.slice(0, 3).join(', ')}. Can you give an example of how you've applied these skills?`,
        type: 'skills'
      });
    }
    
    // Add general questions
    mockQuestions.push({
      id: 'gen-1',
      text: 'Where do you see yourself in five years?',
      type: 'general'
    });
    
    mockQuestions.push({
      id: 'gen-2',
      text: 'What are your strengths and weaknesses?',
      type: 'general'
    });
    
    return mockQuestions;
  };

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    
    setLoading(true);
    try {
      const response = await api.post('/api/interview/answer/', {
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        answer: answer,
        resume_data: resumeData
      });
      
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error submitting answer:', error);
      
      // Fallback feedback if API fails
      setFeedback({
        text: "Your answer covered some key points, but could be more specific with examples. Consider structuring your response with a clearer introduction and conclusion.",
        clarity_score: 7,
        relevance_score: 8,
        depth_score: 6
      });
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setAnswer('');
      setFeedback(null);
    } else {
      // Interview complete
      setInterviewComplete(true);
    }
  };

  const renderResumeDetails = () => {
    if (!resumeData) return null;
    
    return (
      <div className="resume-preview">
        <h3>Interview based on your resume:</h3>
        <div className="resume-content">
          {resumeData.personal_info?.name && (
            <p><strong>Name:</strong> {resumeData.personal_info.name}</p>
          )}
          
          {resumeData.education?.length > 0 && (
            <p><strong>Education:</strong> {resumeData.education[0].degree}, {resumeData.education[0].institution}</p>
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
        <div className="interview-complete">
          <h1>Interview Complete!</h1>
          <p>Thank you for completing your practice interview.</p>
          <button 
            className="home-button"
            onClick={() => navigate('/dashboard')}
          >
            View Results
          </button>
          <button 
            className="restart-button"
            onClick={() => {
              setInterviewComplete(false);
              startInterview();
            }}
          >
            Start New Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-container">
      <div className="interview-header">
        <h1>Interview Practice</h1>
        <div className="progress-container">
          <div className="progress-text">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {renderResumeDetails()}
      </div>

      {currentQuestion && (
        <div className="question-container">
          <h2 className="question-text">{currentQuestion.text}</h2>
          
          {!feedback ? (
            <div className="answer-container">
              <textarea
                value={answer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here..."
                disabled={loading}
                rows={6}
                className="answer-input"
              />
              <button 
                onClick={submitAnswer}
                disabled={loading || !answer.trim()}
                className="submit-button"
              >
                {loading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          ) : (
            <div className="feedback-container">
              <h3>Your Answer:</h3>
              <p className="user-answer">{answer}</p>
              
              <h3>Feedback:</h3>
              <div className="feedback-content">
                {feedback.text}
              </div>
              
              <div className="score-container">
                <div className="score-card">
                  <span className="score-label">Clarity</span>
                  <span className="score-value">{feedback.clarity_score}/10</span>
                </div>
                <div className="score-card">
                  <span className="score-label">Relevance</span>
                  <span className="score-value">{feedback.relevance_score}/10</span>
                </div>
                <div className="score-card">
                  <span className="score-label">Depth</span>
                  <span className="score-value">{feedback.depth_score}/10</span>
                </div>
              </div>
              
              <button 
                onClick={nextQuestion}
                className="next-button"
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Interview;
