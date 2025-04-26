import React from 'react';
import { Button } from '../components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-5xl font-bold text-blue-800 mb-4">
        Welcome to IntelliView
      </h1>
      <p className="text-lg text-gray-600 mb-6 max-w-md">
        A smart AI-driven platform to analyze and evaluate resumes with ease. Upload, review, and get feedback instantly.
      </p>
      <Button className="text-lg px-6 py-3">
        Get Started
      </Button>
    </div>
  );
}
