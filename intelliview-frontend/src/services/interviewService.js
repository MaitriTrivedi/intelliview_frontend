// Remove unused imports at the top of the file

import { getLlmApiBaseUrl, ENABLE_LLM_API_LOGS, FEATURES, MAIN_API_BASE_URL } from '../config/environment';

// LLM Service configuration
const LLM_SERVICE_URL = getLlmApiBaseUrl();
const PROXY_LLM_CALLS = true; // Set to true to use the Django backend as a proxy

if (ENABLE_LLM_API_LOGS) {
  console.log('LLM Service URL:', LLM_SERVICE_URL);
  console.log('Using proxy for LLM calls:', PROXY_LLM_CALLS);
}

// Helper function for making LLM API calls
const callLlmApi = async (endpoint, data) => {
  // If fallbacks are enabled and we've had failures, use fallbacks immediately
  if (FEATURES.USE_LLM_FALLBACKS && callLlmApi.failureCount > 2) {
    if (ENABLE_LLM_API_LOGS) {
      console.log(`Using fallback for ${endpoint} after previous failures`);
    }
    throw new Error('Using fallback after previous failures');
  }
  
  // Remove leading slash and api/ prefix if present
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Determine whether to use the proxy or direct connection
  let url;
  if (PROXY_LLM_CALLS) {
    // Use Django backend as proxy to avoid CORS issues
    // Don't include api/ when using the proxy as it's added on the backend
    url = `${MAIN_API_BASE_URL}/api/llm/${cleanEndpoint}`.replace(/([^:]\/)\/+/g, "$1");
  } else {
    // Direct connection to LLM service
    // Make sure api/ prefix is included for direct connections
    if (!cleanEndpoint.startsWith('api/')) {
      cleanEndpoint = `api/${cleanEndpoint}`;
    }
    url = `${LLM_SERVICE_URL}/${cleanEndpoint}`.replace(/([^:]\/)\/+/g, "$1");
  }
  
  if (ENABLE_LLM_API_LOGS) {
    console.log(`Calling LLM API via ${PROXY_LLM_CALLS ? 'proxy' : 'direct'}: ${url}`);
    console.log('Request payload:', data);
  }
  
  try {
    // Create an AbortController for the timeout
    const timeoutMs = 60000; // 60 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
    }, timeoutMs);
    
    console.log(`Setting LLM API timeout to ${timeoutMs}ms for ${endpoint}`);
    
    // Make the fetch request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error(`LLM API error (${response.status}): ${errorText}`);
      
      // Track failures for fallback handling
      callLlmApi.failureCount = (callLlmApi.failureCount || 0) + 1;
      
      throw new Error(`LLM API returned ${response.status}: ${response.statusText}`);
    }
    
    // Reset failure count on success
    callLlmApi.failureCount = 0;
    
    const result = await response.json();
    if (ENABLE_LLM_API_LOGS) {
      console.log('LLM API response:', result);
    }
    return result;
  } catch (error) {
    // Check if this was an abort error (timeout)
    if (error.name === 'AbortError') {
      console.error(`LLM API call to ${endpoint} timed out`);
    } else {
      console.error(`Error calling LLM API (${endpoint}):`, error);
    }
    
    // Track failures for fallback handling
    callLlmApi.failureCount = (callLlmApi.failureCount || 0) + 1;
    
    throw error;
  }
};

// Initialize failure counter
callLlmApi.failureCount = 0;

// Interview states/phases
export const INTERVIEW_PHASES = {
  INTRODUCTION: 'introduction',
  PROJECT: 'project',
  TECHNICAL: 'technical',
  CS_FUNDAMENTALS: 'cs_fundamentals',
  DSA: 'dsa',
  FOLLOWUP: 'followup',
  SUMMARY: 'summary'
};

/**
 * Service that handles the interview flow by interacting with the LLM API
 */
const interviewService = {
  constructor() {
    this.interviewData = {
      candidateName: '',
      role: '',
      techStack: [],
      questions: [],
      currentPhase: '',  // Start with no phase selected
      resumeData: null,
      scores: {}
    };
    
    // Ping the LLM service on initialization
    this.pingLlmService();
  },
  
  /**
   * Pings the LLM service to check connectivity
   */
  async pingLlmService() {
    try {
      // During initialization, we'll do a simple check without making an API call
      // to avoid duplicate calls with generateIntroductionQuestion
      console.log('Testing LLM service connectivity...');
      
      // Check if we've already made a successful call
      if (this._llmServicePinged) {
        console.log('Already verified LLM connectivity');
        return true;
      }
      
      // Set flag to indicate we've checked connectivity
      this._llmServicePinged = true;
      
      // Return true without making an actual API call since the
      // introduction question call will verify connectivity
      return true;
    } catch (error) {
      console.error('LLM service connectivity test failed:', error);
      return false;
    }
  },

  /**
   * Initialize the interview with candidate data
   * @param {Object} data - Initial interview data
   */
  initInterview(data) {
    console.log('Initializing interview with data:', data);
    
    // FIRST: Always clear any existing state
    this.clearProgress();
    localStorage.removeItem('interviewProgress');
    localStorage.removeItem('currentInterviewPhase');
    
    // Set new interview data
    this.interviewData = {
      candidateName: data.candidateName || data.resume?.user?.first_name || 'Candidate',
      role: data.role || 'Software Developer',
      techStack: data.techStack || ['JavaScript', 'React', 'Python'],
      resumeData: data.resumeData || null,
      currentPhase: '', // Start with no phase selected for proper initialization
      questions: [],
      scores: {}
    };
    
    // Debug
    console.log('Interview initialized with:', this.interviewData);
    
    // Return the fresh interview data
    return this.interviewData;
  },

  /**
   * Generate introduction question
   */
  async generateIntroductionQuestion() {
    console.log('Generating introduction question...');
    
    // Explicitly set the current phase to INTRODUCTION
    this.interviewData.currentPhase = INTERVIEW_PHASES.INTRODUCTION;
    
    try {
      const response = await callLlmApi('generate_introduction_question', {
        candidate_name: this.interviewData.candidateName,
        role: this.interviewData.role
      });
      
      console.log('Introduction question response:', response);
      
      const question = {
        type: INTERVIEW_PHASES.INTRODUCTION,
        text: response.question,
        answer: null,
        evaluation: null
      };
      
      this.interviewData.questions.push(question);
      
      // Make sure the current phase is set correctly
      this.interviewData.currentPhase = INTERVIEW_PHASES.INTRODUCTION;
      
      console.log('Current phase after generating introduction question:', this.interviewData.currentPhase);
      
      return question;
    } catch (error) {
      console.error('Error generating introduction question:', error);
      // Fallback question in case of error
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.INTRODUCTION,
        text: `Tell me about your background and experience in ${this.interviewData.role} roles.`,
        answer: null,
        evaluation: null
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.INTRODUCTION;
      return fallbackQuestion;
    }
  },

  /**
   * Generate project question based on resume data
   */
  async generateProjectQuestion() {
    try {
      const response = await callLlmApi('generate_project_question', {
        resume_data: this.interviewData.resumeData
      });
      
      const question = {
        type: INTERVIEW_PHASES.PROJECT,
        text: response.question,
        answer: null,
        evaluation: null
      };
      
      this.interviewData.questions.push(question);
      this.interviewData.currentPhase = INTERVIEW_PHASES.PROJECT;
      return question;
    } catch (error) {
      console.error('Error generating project question:', error);
      // Fallback question
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.PROJECT,
        text: 'Can you describe one of your most challenging projects and how you approached it?',
        answer: null,
        evaluation: null
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.PROJECT;
      return fallbackQuestion;
    }
  },

  /**
   * Generate technical question
   */
  async generateTechnicalQuestion() {
    try {
      const response = await callLlmApi('generate_technical_question', {
        resume_data: this.interviewData.resumeData,
        tech_stack: this.interviewData.techStack,
        role: this.interviewData.role
      });
      
      const question = {
        type: INTERVIEW_PHASES.TECHNICAL,
        text: response.question,
        answer: null,
        evaluation: null
      };
      
      this.interviewData.questions.push(question);
      this.interviewData.currentPhase = INTERVIEW_PHASES.TECHNICAL;
      return question;
    } catch (error) {
      console.error('Error generating technical question:', error);
      // Fallback question
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.TECHNICAL,
        text: `Explain how you would implement a feature using ${this.interviewData.techStack[0]}.`,
        answer: null,
        evaluation: null
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.TECHNICAL;
      return fallbackQuestion;
    }
  },

  /**
   * Generate CS fundamentals question
   */
  async generateCSFundamentalsQuestion() {
    try {
      const response = await callLlmApi('generate_cs_fundamentals_question', {
        role: this.interviewData.role,
        tech_stack: this.interviewData.techStack
      });
      
      const question = {
        type: INTERVIEW_PHASES.CS_FUNDAMENTALS,
        text: response.question,
        answer: null,
        evaluation: null
      };
      
      this.interviewData.questions.push(question);
      this.interviewData.currentPhase = INTERVIEW_PHASES.CS_FUNDAMENTALS;
      return question;
    } catch (error) {
      console.error('Error generating CS fundamentals question:', error);
      // Fallback question
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.CS_FUNDAMENTALS,
        text: 'Explain the difference between time complexity and space complexity.',
        answer: null,
        evaluation: null
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.CS_FUNDAMENTALS;
      return fallbackQuestion;
    }
  },

  /**
   * Generate DSA question
   */
  async generateDSAQuestion() {
    try {
      const response = await callLlmApi('generate_dsa_question', {});
      
      const question = {
        type: INTERVIEW_PHASES.DSA,
        text: response.question,
        answer: null,
        evaluation: null,
        raw_data: response.raw_data
      };
      
      this.interviewData.questions.push(question);
      this.interviewData.currentPhase = INTERVIEW_PHASES.DSA;
      return question;
    } catch (error) {
      console.error('Error generating DSA question:', error);
      // Fallback question
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.DSA,
        text: 'Write a function to find the maximum element in an array.',
        answer: null,
        evaluation: null
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.DSA;
      return fallbackQuestion;
    }
  },

  /**
   * Generate followup question based on previous answer
   */
  async generateFollowupQuestion(previousQuestion, answer) {
    try {
      const response = await callLlmApi('generate_followup_question', {
        previous_question: previousQuestion,
        answer: answer
      });
      
      const question = {
        type: INTERVIEW_PHASES.FOLLOWUP,
        text: response.question,
        answer: null,
        evaluation: null,
        previous_question: previousQuestion,
        previous_answer: answer
      };
      
      this.interviewData.questions.push(question);
      this.interviewData.currentPhase = INTERVIEW_PHASES.FOLLOWUP;
      return question;
    } catch (error) {
      console.error('Error generating followup question:', error);
      // Fallback question
      const fallbackQuestion = {
        type: INTERVIEW_PHASES.FOLLOWUP,
        text: 'Can you elaborate more on your previous answer?',
        answer: null,
        evaluation: null,
        previous_question: previousQuestion,
        previous_answer: answer
      };
      this.interviewData.questions.push(fallbackQuestion);
      this.interviewData.currentPhase = INTERVIEW_PHASES.FOLLOWUP;
      return fallbackQuestion;
    }
  },

  /**
   * Evaluate an answer to a question
   * @param {string} questionType - The type of question
   * @param {string} question - The question text
   * @param {string} answer - The answer to evaluate
   * @returns {Object} The evaluation
   */
  async evaluateAnswer(questionType, question, answer) {
    // Create a more meaningful fallback evaluation based on the question type
    const createFallbackEvaluation = () => {
      // Default fallback
      let fallback = {
        feedback: "I couldn't evaluate your answer due to connection issues with our evaluation service. Let's continue with the next question.",
        score: 3,
        strengths: ['Your answer was recorded successfully'],
        weaknesses: [],
        suggestions: ['Try to be specific and detailed in your answers']
      };
      
      // Customize fallback based on question type
      switch(questionType) {
        case INTERVIEW_PHASES.INTRODUCTION:
          fallback.feedback = "Your introduction has been recorded. Due to a temporary issue, I couldn't provide detailed feedback, but your interview will continue.";
          break;
        case INTERVIEW_PHASES.TECHNICAL:
          fallback.feedback = "Your technical response has been recorded. Let's proceed with more questions to showcase your knowledge.";
          break;
        case INTERVIEW_PHASES.PROJECT:
          fallback.feedback = "Thanks for sharing your project experience. Let's move on to technical questions.";
          break;
        case INTERVIEW_PHASES.CS_FUNDAMENTALS:
        case INTERVIEW_PHASES.DSA:
          fallback.feedback = "Your answer to this computer science question has been recorded. Let's continue with the interview.";
          break;
        default:
          fallback.feedback = "Your answer has been recorded. Let's continue with the interview.";
          break;
      }
      
      return fallback;
    };
    
    try {
      console.log("Starting answer evaluation...");
      
      // Make the API call with all required parameters
      const response = await callLlmApi('evaluate_answer', {
        question_type: questionType,
        question: question,
        answer: answer,
        role: this.interviewData.role,
        tech_stack: this.interviewData.techStack
      });
      
      const evaluation = {
        feedback: response.feedback,
        score: response.score,
        strengths: response.strengths || [],
        weaknesses: response.weaknesses || [],
        suggestions: response.suggestions || []
      };
      
      // Store score in interview data
      this.interviewData.scores[questionType] = response.score;
      
      // Update the last question with evaluation
      const lastQuestion = this.interviewData.questions[this.interviewData.questions.length - 1];
      lastQuestion.evaluation = evaluation;
      
      console.log("Answer evaluation completed successfully");
      
      return evaluation;
    } catch (error) {
      console.error('Error evaluating answer:', error);
      
      // Create a suitable fallback evaluation
      const fallback = createFallbackEvaluation();
      
      // Store fallback score in interview data
      this.interviewData.scores[questionType] = fallback.score;
      
      // Update the last question with fallback evaluation
      const lastQuestion = this.interviewData.questions[this.interviewData.questions.length - 1];
      lastQuestion.evaluation = fallback;
      
      console.log("Using fallback evaluation due to error");
      
      return fallback;
    }
  },

  /**
   * Generate a summary report of the interview
   * @returns {Object} The summary report
   */
  async generateSummaryReport() {
    try {
      console.log('Generating summary report with data:', {
        questions: this.interviewData.questions,
        scores: this.interviewData.scores,
        candidate_name: this.interviewData.candidateName,
        role: this.interviewData.role,
        tech_stack: this.interviewData.techStack
      });
      
      // Format questions to ensure they have all required fields
      const formattedQuestions = this.interviewData.questions.map(q => ({
        type: q.type,
        text: q.text,
        answer: q.answer || '',
        evaluation: q.evaluation ? {
          score: q.evaluation.score || 0,
          feedback: q.evaluation.feedback || '',
          strengths: q.evaluation.strengths || [],
          weaknesses: q.evaluation.weaknesses || [],
          suggestions: q.evaluation.suggestions || []
        } : null
      }));
      
      const response = await callLlmApi('generate_summary_report', {
        questions: formattedQuestions,
        scores: this.interviewData.scores,
        candidate_name: this.interviewData.candidateName,
        role: this.interviewData.role,
        tech_stack: this.interviewData.techStack
      });
      
      const report = {
        overall_feedback: response.overall_feedback || "Thank you for completing the interview.",
        overall_score: response.overall_score || this.calculateAverageScore(),
        strengths: response.strengths || [],
        areas_for_improvement: response.areas_for_improvement || [],
        next_steps: response.next_steps || [],
        detailed_feedback: response.detailed_feedback || {},
        // Add fields needed for the summary display
        assessment: {
          recommendation: response.recommendation || 'Consider',
          overall_impression: response.overall_impression || "You've completed all interview questions.",
          technical_strengths: response.technical_strengths || response.strengths || [],
          areas_for_improvement: response.areas_for_improvement || []
        },
        percentage: response.percentage || Math.round(this.calculateAverageScore() * 10),
        total_score: response.total_score || this.calculateTotalScore(),
        max_possible: response.max_possible || 10 * (this.interviewData.questions.length || 6)
      };
      
      this.interviewData.summaryReport = report;
      this.interviewData.currentPhase = INTERVIEW_PHASES.SUMMARY;
      
      return report;
    } catch (error) {
      console.error('Error generating summary report:', error);
      
      // Get average score for calculations
      const avgScore = this.calculateAverageScore();
      
      // Fallback summary report
      const report = {
        overall_feedback: "Thank you for completing the interview. Here's a summary of your performance.",
        overall_score: avgScore,
        strengths: ['You completed the full interview'],
        areas_for_improvement: ['Continue practicing technical questions'],
        next_steps: ['Review the feedback for each question', 'Practice more interviews'],
        detailed_feedback: {},
        // Add fields needed for the summary display
        assessment: {
          recommendation: avgScore >= 8 ? 'Highly Recommended' : 
                          avgScore >= 6 ? 'Recommended' : 
                          avgScore >= 4 ? 'Consider' : 'Reject',
          overall_impression: "You've completed all the interview questions. Keep practicing to improve your performance.",
          technical_strengths: ['You completed the full interview'],
          areas_for_improvement: ['Continue practicing technical questions']
        },
        percentage: Math.round(avgScore * 10),
        total_score: this.calculateTotalScore(),
        max_possible: 10 * (this.interviewData.questions.length || 6)
      };
      
      this.interviewData.summaryReport = report;
      this.interviewData.currentPhase = INTERVIEW_PHASES.SUMMARY;
      
      return report;
    }
  },
  
  /**
   * Calculate total score across all questions
   */
  calculateTotalScore() {
    const scores = Object.values(this.interviewData.scores);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0);
  },

  /**
   * Helper method to calculate average score
   */
  calculateAverageScore() {
    const scores = Object.values(this.interviewData.scores);
    if (scores.length === 0) return 3; // Default score if no questions answered
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  },

  /**
   * Move to the next phase of the interview
   */
  async moveToNextPhase() {
    console.log('Current phase:', this.interviewData.currentPhase);
    console.log('Current questions:', this.interviewData.questions);
    
    // Determine the next phase
    let nextPhase;
    
    if (!this.interviewData.currentPhase || this.interviewData.currentPhase === '') {
      // If there's no current phase, start with introduction
      nextPhase = INTERVIEW_PHASES.INTRODUCTION;
      console.log('No current phase, starting with INTRODUCTION');
    } else {
      // Otherwise, follow the defined sequence
      switch (this.interviewData.currentPhase) {
        case INTERVIEW_PHASES.INTRODUCTION:
          nextPhase = INTERVIEW_PHASES.PROJECT;
          console.log('Moving from INTRODUCTION to PROJECT');
          break;
        case INTERVIEW_PHASES.PROJECT:
          nextPhase = INTERVIEW_PHASES.TECHNICAL;
          console.log('Moving from PROJECT to TECHNICAL');
          break;
        case INTERVIEW_PHASES.TECHNICAL:
          nextPhase = INTERVIEW_PHASES.CS_FUNDAMENTALS;
          console.log('Moving from TECHNICAL to CS_FUNDAMENTALS');
          break;
        case INTERVIEW_PHASES.CS_FUNDAMENTALS:
          nextPhase = INTERVIEW_PHASES.DSA;
          console.log('Moving from CS_FUNDAMENTALS to DSA');
          break;
        case INTERVIEW_PHASES.DSA:
          nextPhase = INTERVIEW_PHASES.FOLLOWUP;
          console.log('Moving from DSA to FOLLOWUP');
          break;
        case INTERVIEW_PHASES.FOLLOWUP:
          nextPhase = INTERVIEW_PHASES.SUMMARY;
          console.log('Moving from FOLLOWUP to SUMMARY');
          break;
        default:
          console.log('Unknown phase, defaulting to INTRODUCTION');
          nextPhase = INTERVIEW_PHASES.INTRODUCTION;
          break;
      }
    }
    
    console.log('Moving to phase:', nextPhase);
    
    // Intercept if we're moving to PROJECT but we don't have an INTRODUCTION question
    // This is a safeguard against the "start with Question 2" issue
    if (nextPhase === INTERVIEW_PHASES.PROJECT) {
      const introQuestions = this.interviewData.questions.filter(
        q => q.type === INTERVIEW_PHASES.INTRODUCTION
      );
      
      if (introQuestions.length === 0) {
        console.log('CRITICAL FIX: Moving to PROJECT without an INTRODUCTION question!');
        console.log('Forcing next phase to be INTRODUCTION instead');
        nextPhase = INTERVIEW_PHASES.INTRODUCTION;
      }
    }
    
    // Update the current phase
    this.interviewData.currentPhase = nextPhase;
    
    // Handle each phase appropriately
    switch (nextPhase) {
      case INTERVIEW_PHASES.INTRODUCTION:
        return await this.generateIntroductionQuestion();
      case INTERVIEW_PHASES.PROJECT:
        return await this.generateProjectQuestion();
      case INTERVIEW_PHASES.TECHNICAL:
        return await this.generateTechnicalQuestion();
      case INTERVIEW_PHASES.CS_FUNDAMENTALS:
        return await this.generateCSFundamentalsQuestion();
      case INTERVIEW_PHASES.DSA:
        return await this.generateDSAQuestion();
      case INTERVIEW_PHASES.FOLLOWUP:
        // For followup, get the previous technical or DSA question
        const previousQuestions = this.interviewData.questions;
        let targetQuestionIndex = -1;
        
        // Try to find a technical question first
        for (let i = previousQuestions.length - 1; i >= 0; i--) {
          if (previousQuestions[i].type === INTERVIEW_PHASES.TECHNICAL) {
            targetQuestionIndex = i;
            break;
          }
        }
        
        // If no technical question, try DSA
        if (targetQuestionIndex === -1) {
          for (let i = previousQuestions.length - 1; i >= 0; i--) {
            if (previousQuestions[i].type === INTERVIEW_PHASES.DSA) {
              targetQuestionIndex = i;
              break;
            }
          }
        }
        
        // If still nothing, use the last question
        if (targetQuestionIndex === -1 && previousQuestions.length > 0) {
          targetQuestionIndex = previousQuestions.length - 1;
        }
        
        // Generate followup question
        if (targetQuestionIndex !== -1) {
          const prevQuestion = previousQuestions[targetQuestionIndex];
          return await this.generateFollowupQuestion(prevQuestion.text, prevQuestion.answer);
        } else {
          // Fallback if no questions found
          return await this.generateFollowupQuestion('previous question', 'previous answer');
        }
      case INTERVIEW_PHASES.SUMMARY:
        await this.generateSummaryReport();
        return null; // No more questions, return null
      default:
        console.error('Unknown phase:', nextPhase);
        return null;
    }
  },

  /**
   * Get the current interview data
   */
  getInterviewData() {
    return this.interviewData;
  },

  /**
   * Save interview progress to localStorage
   */
  saveProgress() {
    localStorage.setItem('interviewProgress', JSON.stringify(this.interviewData));
  },

  /**
   * Load interview progress from localStorage
   */
  loadProgress() {
    const savedProgress = localStorage.getItem('interviewProgress');
    if (savedProgress) {
      this.interviewData = JSON.parse(savedProgress);
      return true;
    }
    return false;
  },

  /**
   * Clear interview progress
   */
  clearProgress() {
    localStorage.removeItem('interviewProgress');
    this.interviewData = {
      candidateName: '',
      role: '',
      techStack: [],
      questions: [],
      currentPhase: '',
      resumeData: null,
      scores: {}
    };
  }
};

export default interviewService; 