import React, { useState } from 'react';
import axios from '../api/axiosConfig';

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMsg('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMsg('Please select a file.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('resumes/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload successful:', response.data);
      setMsg('Resume uploaded successfully!');
      setIsUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setMsg('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Upload Resume</h2>
      <form onSubmit={handleUpload}>
        <input 
          type="file" 
          onChange={handleFileChange} 
          accept=".pdf,.doc,.docx,.txt" 
          disabled={isUploading}
        />
        <br /><br />
        <button type="submit" disabled={isUploading || !file}>
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {msg && <p className={msg.includes('success') ? 'success-message' : 'error-message'}>{msg}</p>}
    </div>
  );
}

export default ResumeUpload;
