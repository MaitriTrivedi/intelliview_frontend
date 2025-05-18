import { useEffect } from 'react';
import { MAIN_API_BASE_URL } from '../config/environment';

/**
 * Custom hook to save interview history data to the backend
 * @param {Array} questions - The questions data to save
 * @param {boolean} shouldSave - Whether to trigger the save operation
 */
const useSaveInterviewHistory = (questions, shouldSave = false) => {
  useEffect(() => {
    if (!shouldSave || !questions || questions.length === 0) {
      return;
    }
    
    const saveInterviewHistory = async () => {
      // Only try to save if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        // Prepare the payload
        const payload = {
          questions: questions
        };
        
        // Make the API call
        const response = await fetch(`${MAIN_API_BASE_URL}/api/interviews/save-history/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          console.log('Interview history saved successfully');
          return true;
        } else {
          console.error('Failed to save interview history:', await response.text());
          return false;
        }
      } catch (error) {
        console.error('Error saving interview history:', error);
        return false;
      }
    };
    
    saveInterviewHistory();
  }, [questions, shouldSave]);
};

export default useSaveInterviewHistory; 