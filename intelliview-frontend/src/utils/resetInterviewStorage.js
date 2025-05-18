/**
 * Utility script to reset all interview-related localStorage items
 * This can be triggered from the browser console by importing and running this function
 */

// Check for inconsistent interview state and fix it
export const checkAndFixInterviewState = () => {
  try {
    // Get current interview progress
    const interviewProgress = localStorage.getItem('interviewProgress');
    
    if (!interviewProgress) {
      console.log('No interview progress found.');
      return;
    }
    
    // Parse the interview data
    const interviewData = JSON.parse(interviewProgress);
    let isFixed = false;
    
    // Check if there's an inconsistent state: project phase without introduction phase
    if (interviewData.currentPhase === 'project') {
      const hasIntroQuestion = interviewData.questions.some(q => q.type === 'introduction');
      
      if (!hasIntroQuestion) {
        console.log('ISSUE DETECTED: Interview in "project" phase but no introduction question found');
        
        // Reset the interview state to fix the issue
        resetAllInterviewStorage();
        localStorage.setItem('interviewJustReset', 'true');
        
        console.log('Fixed: Interview state has been reset because of inconsistent phase');
        isFixed = true;
      }
    }
    
    return isFixed;
  } catch (error) {
    console.error('Error checking interview state:', error);
    return false;
  }
};

export const resetAllInterviewStorage = () => {
  console.log('Clearing all interview-related localStorage items...');
  
  // Interview progress and state
  localStorage.removeItem('interviewProgress');
  localStorage.removeItem('currentInterviewPhase');
  
  // Resume data that might affect the interview
  localStorage.removeItem('resumeAnalysis');
  localStorage.removeItem('resumeDetails');
  
  // Any other cache keys that might interfere
  localStorage.removeItem('lastInterviewState');
  localStorage.removeItem('interviewQuestions');
  localStorage.removeItem('interviewPhase');
  localStorage.removeItem('interviewSettings');
  
  console.log('All interview data cleared from localStorage');
  console.log('Please reload the page to start fresh');
  
  return {
    success: true,
    message: 'Interview storage reset completed'
  };
};

// Add a global access point for easy console access
if (typeof window !== 'undefined') {
  window.resetInterviewStorage = resetAllInterviewStorage;
  window.checkInterviewState = checkAndFixInterviewState;
  console.log('Reset utility loaded. Run window.resetInterviewStorage() in console to reset interview state.');
  
  // Auto-check for inconsistent state on load
  setTimeout(() => {
    const wasFixed = checkAndFixInterviewState();
    if (wasFixed) {
      console.log('Auto-fixed inconsistent interview state. Page will reload in 1 second.');
      setTimeout(() => window.location.reload(), 1000);
    }
  }, 1000);
}

export default resetAllInterviewStorage; 