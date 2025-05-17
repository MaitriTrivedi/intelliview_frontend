import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { API_BASE_URL } from '../config/api';
import { parseResume } from '../utils/resumeParser';
import '../styles/Home.css';

const Home = () => {
  const { user, refreshUser, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState('');
  const [uploadDetails, setUploadDetails] = useState(null);
  const [isProcessingResume, setIsProcessingResume] = useState(false);

  // Load saved resume data on component mount
  useEffect(() => {
    // Check authentication status on component mount
    const verifyAuth = async () => {
      // Just check auth status without forcing refresh
      checkAuthStatus();
    };
    
    verifyAuth();

    // Check for saved resume details
    const savedResumeDetails = localStorage.getItem('resumeDetails');
    if (savedResumeDetails) {
      try {
        const parsedDetails = JSON.parse(savedResumeDetails);
        setUploadDetails(parsedDetails);
        setUploadSuccess(true);
        console.log('Loaded saved resume details:', parsedDetails);
      } catch (err) {
        console.error('Error parsing saved resume details:', err);
        localStorage.removeItem('resumeDetails');
      }
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Accept more file types
      if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
      } else {
        setFile(null);
        setError('Please select a PDF, Word, or text file');
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    // Only refresh user right before upload if needed
    console.log('Verifying authentication before upload');
    const authStatus = checkAuthStatus();
    if (!authStatus.hasUser) {
      // Only refresh if user is not already loaded
      await refreshUser();
      // Check again after refresh
      const newAuthStatus = checkAuthStatus();
      if (!newAuthStatus.hasUser) {
        setError('You must be logged in to upload a resume. Please log in again.');
        navigate('/login');
        return;
      }
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading resume to: /api/resumes/upload/');
      // Use the API instance instead of fetch for consistent auth token handling
      const response = await api.post('/api/resumes/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload response:', response.data);
      
      // Save resume details to localStorage for persistence
      localStorage.setItem('resumeDetails', JSON.stringify(response.data));
      
      setUploadSuccess(true);
      setUploadDetails(response.data);
      setUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Failed to upload resume: ${error.response?.data?.detail || error.message}. Please try again.`);
      setUploading(false);
    }
  };

  // Function to clear current resume
  const handleClearResume = () => {
    localStorage.removeItem('resumeDetails');
    localStorage.removeItem('resumeAnalysis');
    setUploadSuccess(false);
    setUploadDetails(null);
    setFile(null);
  };

  const startInterview = async () => {
    if (!uploadDetails) {
      setError('Please upload a resume first');
      return;
    }

    setIsProcessingResume(true);
    setError('');

    try {
      // Check if we already have parsed resume data
      const savedResumeAnalysis = localStorage.getItem('resumeAnalysis');
      
      if (savedResumeAnalysis) {
        console.log('Using cached resume analysis');
        navigate('/interview', { 
          state: { 
            resumeData: JSON.parse(savedResumeAnalysis),
            resumeFile: uploadDetails
          } 
        });
        return;
      }

      // Get the file URL from upload details
      const fileUrl = uploadDetails.file || uploadDetails.filename;
      
      if (!fileUrl) {
        throw new Error('Resume file information not found');
      }

      console.log('Parsing resume file:', fileUrl);
      
      // Use our resume parser to extract data
      const resumeData = await parseResume(fileUrl);
      
      console.log('Resume data extracted:', resumeData);
      
      // Store the parsed resume data for future use
      localStorage.setItem('resumeAnalysis', JSON.stringify(resumeData));
      
      // Navigate to interview page with resume data
      navigate('/interview', { 
        state: { 
          resumeData: resumeData,
          resumeFile: uploadDetails
        } 
      });
    } catch (error) {
      console.error('Error processing resume:', error);
      setError(`Failed to process resume: ${error.message}. Please try again.`);
      setIsProcessingResume(false);
    }
  };

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h1>Welcome to IntelliView</h1>
        <h2>Hello, {user?.first_name || user?.username || user?.email || 'User'}!</h2>
        <p>
          IntelliView is your AI-powered interview preparation platform. Upload your resume
          and start practicing for your next interview with our intelligent system.
        </p>
      </div>

      <div className="features-container">
        <div className="feature-card resume-upload">
          <h2>Upload Your Resume</h2>
          <p>Upload your resume to help us personalize your interview experience.</p>
          
          {!uploadSuccess ? (
            <form onSubmit={handleUpload} className="upload-form">
              <div className="file-input-container">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="resume" className="file-label">
                  {file ? file.name : 'Choose file (PDF, Word, or Text)'}
                </label>
              </div>
              
              <button 
                type="submit" 
                className="upload-button"
                disabled={uploading || !file}
              >
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>
              
              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </form>
          ) : (
            <div className="current-resume">
              <div className="success-message">
                <p>Resume uploaded successfully!</p>
                {uploadDetails && (
                  <div className="upload-details">
                    <p><strong>File:</strong> {uploadDetails.file || uploadDetails.filename}</p>
                    {uploadDetails.uploaded_at && (
                      <p><strong>Uploaded at:</strong> {new Date(uploadDetails.uploaded_at).toLocaleString()}</p>
                    )}
                    {uploadDetails.id && (
                      <p><strong>Resume ID:</strong> {uploadDetails.id}</p>
                    )}
                    <p className="success-description">
                      Your resume has been analyzed and is ready for use in interviews.
                    </p>
                  </div>
                )}
              </div>
              <button onClick={handleClearResume} className="clear-button">
                Upload Different Resume
              </button>
            </div>
          )}
        </div>

        <div className="feature-card start-interview">
          <h2>Start Interview Practice</h2>
          <p>Begin your interview preparation with personalized questions.</p>
          <button 
            onClick={startInterview} 
            className="start-button"
            disabled={!uploadSuccess || isProcessingResume}
          >
            {isProcessingResume ? 'Analyzing Resume...' : 'Start Interview'}
          </button>
          {!uploadSuccess && (
            <p className="info-message">
              Please upload your resume first
            </p>
          )}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* API Info for debugging */}
      <div className="debug-info" style={{ fontSize: '0.8rem', color: '#999', marginTop: '2rem', textAlign: 'center' }}>
        API URL: {API_BASE_URL}
      </div>
    </div>
  );
};

export default Home;
