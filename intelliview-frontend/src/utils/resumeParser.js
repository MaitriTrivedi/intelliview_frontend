// Frontend resume parser utility
import api from '../config/api';

// Extract sections from text
export const extractSections = (text) => {
  const sections = {};
  const positions = {};
  const sectionKeywords = [
    "education", "experience", "projects", "skills", 
    "publications", "achievements", "coursework", "volunteer"
  ];
  
  const lowerText = text.toLowerCase();

  // Find positions of each section
  sectionKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    const match = lowerText.match(regex);
    if (match) {
      positions[keyword] = match.index;
    }
  });

  // Sort sections by position
  const sortedSections = Object.entries(positions).sort((a, b) => a[1] - b[1]);

  // Extract text for each section
  for (let i = 0; i < sortedSections.length; i++) {
    const [section, start] = sortedSections[i];
    const end = i + 1 < sortedSections.length ? sortedSections[i + 1][1] : text.length;
    sections[section] = text.substring(start, end).trim();
  }

  // Add personal info section (text before first section)
  if (sortedSections.length > 0) {
    sections['personal_info'] = text.substring(0, sortedSections[0][1]).trim();
  } else {
    sections['personal_info'] = text;
  }

  return sections;
};

// Extract personal info from text
export const extractPersonalInfo = (text) => {
  const info = {};
  
  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    info.email = emailMatch[0];
  }
  
  // Extract phone
  const phoneMatch = text.match(/(\+\d{1,3})?\s?-?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) {
    info.phone = phoneMatch[0];
  }
  
  // Extract name (assuming it's in the first few lines and has capital letters)
  const lines = text.split("\n").slice(0, 3);
  for (const line of lines) {
    const trimmedLine = line.trim();
    const words = trimmedLine.split(/\s+/);
    if (words.length > 0 && words.every(w => w.length > 0 && w[0] === w[0].toUpperCase())) {
      info.name = trimmedLine;
      break;
    }
  }
  
  return info;
};

// Main function to extract resume data
export const parseResume = async (resumeId) => {
  try {
    const response = await api.get(`/api/resumes/${resumeId}/parse/`);
    return response.data;
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
};

// Function to extract text from PDF in browser - no longer needed as backend handles this
export const extractTextFromPdf = async (file) => {
  console.log('PDF extraction now happens on the backend');
  return "PDF extraction now happens on the backend";
}; 