import { MAIN_API_BASE_URL } from '../config/environment';

/**
 * Function to save a single question, answer, feedback and score to the backend
 * @param {string} question - The question text
 * @param {string} answer - The user's answer
 * @param {object} evaluation - The evaluation result containing feedback and score
 * @param {string} sessionId - Optional existing session ID
 * @returns {Promise} A promise resolving to the result of the save operation
 */
const saveQuestionAnswer = async (question, answer, evaluation, sessionId = null) => {
  // Only try to save if user is authenticated
  const token = localStorage.getItem('token');
  if (!token) return { success: false, error: 'User not authenticated' };
  
  try {
    // Extract feedback and score from evaluation
    const feedback = evaluation?.feedback || '';
    const score = evaluation?.score || null;
    
    // Prepare the payload
    const payload = {
      question,
      answer,
      feedback,
      score
    };
    
    // Add session ID if available
    if (sessionId) {
      payload.session_id = sessionId;
    }
    
    // Make the API call
    const response = await fetch(`${MAIN_API_BASE_URL}/api/interviews/save-question/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Question and answer saved successfully');
      return { 
        success: true, 
        sessionId: data.session_id,
        entryId: data.entry_id
      };
    } else {
      console.error('Failed to save question and answer:', await response.text());
      return { success: false, error: 'API call failed' };
    }
  } catch (error) {
    console.error('Error saving question and answer:', error);
    return { success: false, error: error.message };
  }
};

export default saveQuestionAnswer; 