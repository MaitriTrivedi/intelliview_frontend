// Frontend resume parser utility
import api from '../config/api';

// Extract sections from text
const extractSections = (text) => {
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
const extractPersonalInfo = (text) => {
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
export const parseResume = async (fileUrl) => {
  try {
    console.log('Starting resume parsing for file:', fileUrl);
    
    // Request the backend to process the resume
    const response = await api.post('/api/resumes/parse/', {
      resume_url: fileUrl
    });
    
    return response.data;
  } catch (error) {
    console.error('Error parsing resume:', error);
    // Fallback to mock data if the backend fails
    return {
      personal_info: {
        name: "Resume Owner",
        email: "user@example.com",
        phone: "123-456-7890"
      },
      education: [
        {
          institution: "University placeholder",
          degree: "Computer Science",
          year: "2020-2024",
          gpa: "3.8"
        }
      ],
      experience: [
        {
          position: "Software Developer",
          company: "Tech Company",
          duration: "2022-Present",
          description: "Developed web applications using React"
        }
      ],
      projects: [
        {
          name: "IntelliView",
          description: "AI-powered interview preparation platform",
          technologies: ["React", "Django", "Machine Learning"]
        }
      ],
      skills: ["JavaScript", "React", "Python", "Django"]
    };
  }
};

// Function to extract text from PDF in browser
export const extractTextFromPdf = async (file) => {
  // In a real implementation, you'd use a PDF.js or similar library
  // This is a placeholder that would communicate with the backend
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/resumes/extract-text/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return "Failed to extract text from PDF";
  }
}; 