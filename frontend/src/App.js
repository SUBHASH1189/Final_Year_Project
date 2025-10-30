import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; 
import Chatbot from './Chatbot';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setPrediction(null);
      setError(null);
    } else {
      setSelectedFile(null);
      setPreview(null);
      setError("Please select a valid image file (jpeg, png).");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const API_URL = 'http://localhost:5000/predict';
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setPrediction(response.data);
    } catch (err) {
      console.error("Error making prediction:", err);
      setError('Failed to get prediction. Ensure the backend server is running and the image is valid.');
    } finally {
      setLoading(false);
    }
  };

  const fractureProb = prediction?.fracture_prediction?.probability ?? 0;
  const isFractured = prediction?.fracture_prediction?.is_fractured ?? false;
  const bodyPartLabel = prediction?.body_part_prediction?.label ?? "N/A";

  return (
    <div className="App">
      <header className="App-header">
        <h1>X-Ray Fracture Detection System</h1>
        <p>Upload an X-ray image to detect fractures and classify the body part using an AI model.</p>
      </header>

      <main className="App-main">
        <div className="upload-section">
          <input 
            type="file" 
            id="file-upload" 
            onChange={handleFileChange} 
            accept="image/png, image/jpeg, image/jpg" 
          />
          <label htmlFor="file-upload" className="custom-file-upload">
            Choose Image
          </label>
          <button onClick={handleUpload} disabled={!selectedFile || loading}>
            {loading ? 'Analyzing...' : 'Detect Fracture'}
          </button>
        </div>

        {selectedFile && <div className="file-name">Selected file: <strong>{selectedFile.name}</strong></div>}

        <div className="results-container">
          <div className="panel image-preview">
            <h3>Image Preview</h3>
            {preview ? <img src={preview} alt="X-ray preview" /> : <p>Your selected image will appear here.</p>}
          </div>

          <div className="panel prediction-output">
            <h3>Analysis Results</h3>
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loader"></div>}
            {prediction && !loading && (
              <div className="prediction-details">
                <div className="prediction-item">
                  <strong>Body Part:</strong> 
                  <span>{bodyPartLabel}</span>
                </div>
                <div className="prediction-item">
                  <strong>Fracture Status:</strong>
                  <span className={isFractured ? 'fractured' : 'normal'}>
                    {isFractured ? 'Fracture Detected' : 'Normal'}
                  </span>
                </div>
                <div className="prediction-item">
                  <strong>Fracture Confidence:</strong>
                  <div className="confidence-bar-container">
                    <div 
                      className="confidence-bar" 
                      style={{ width: `${fractureProb * 100}%` }}
                      title={`${(fractureProb * 100).toFixed(2)}%`}
                    ></div>
                  </div>
                  <span>{(fractureProb * 100).toFixed(2)}%</span>
                </div>
              </div>
            )}
             {!prediction && !loading && !error && <p>Results will be shown here after analysis.</p>}
          </div>
        </div>
      </main>

      {/* --- IMPROVEMENT: Pass confidence to Chatbot --- */}
      {isFractured && (
        <Chatbot 
          bodyPart={bodyPartLabel} 
          confidence={fractureProb} 
        />
      )}
      
    </div>
  );
}

export default App;