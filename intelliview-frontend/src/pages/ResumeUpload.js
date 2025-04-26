import React, { useState } from 'react';
import axios from '../api/axiosConfig';

function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');

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

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post('resume/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMsg('Resume uploaded successfully!');
    } catch (error) {
      setMsg('Upload failed. Try again.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      <h2>Upload Resume</h2>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
        <br /><br />
        <button type="submit">Upload</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}

export default ResumeUpload;
