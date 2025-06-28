import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import ImageSearch from './ImageSearch';

function App() {
  const [currentMode, setCurrentMode] = useState('analyze'); // 'analyze' or 'search'
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [textInputs, setTextInputs] = useState(['cat', 'dog', 'bird']);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const addTextInput = () => {
    setTextInputs([...textInputs, '']);
  };

  const removeTextInput = (index) => {
    if (textInputs.length > 1) {
      const newInputs = textInputs.filter((_, i) => i !== index);
      setTextInputs(newInputs);
    }
  };

  const updateTextInput = (index, value) => {
    const newInputs = [...textInputs];
    newInputs[index] = value;
    setTextInputs(newInputs);
  };

  const analyzeImage = async () => {
    if (!selectedImage || textInputs.filter(text => text.trim()).length === 0) {
      setError('请上传图片并输入至少一个文本描述');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('texts', JSON.stringify(textInputs.filter(text => text.trim())));

      const response = await axios.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.results) {
        const formattedResults = response.data.results.map(result => ({
          text: result.text,
          score: result.probability
        }));
        setResults(formattedResults);
      } else if (response.data.error) {
        setError(response.data.error);
      } else {
        setError('未知错误');
      }
    } catch (err) {
      console.error('分析错误:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('网络错误或服务器无响应。请确保后端服务正在运行。');
      }
    } finally {
      setLoading(false);
    }
  };

  if (currentMode === 'search') {
    return <ImageSearch onModeChange={setCurrentMode} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎯 OpenCLIP 图像文本匹配</h1>
        <p>上传图片，输入文本描述，查看相似度分析结果</p>
        
        {/* 模式切换按钮 */}
        <div className="mode-switcher">
          <button 
            className={`mode-btn ${currentMode === 'analyze' ? 'active' : ''}`}
            onClick={() => setCurrentMode('analyze')}
          >
            📊 图片分析模式
          </button>
          <button 
            className={`mode-btn ${currentMode === 'search' ? 'active' : ''}`}
            onClick={() => setCurrentMode('search')}
          >
            🔍 图片搜索模式
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* 图片上传和文本描述 - 同一行 */}
        <div className="content-row">
          {/* 图片上传区域 */}
          <section className="upload-section">
            <h2>📸 上传图片</h2>
            <div 
              className="upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="预览" className="image-preview" />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📁</div>
                  <p>点击或拖拽图片到此处</p>
                  <p>支持 JPG, PNG, GIF 格式</p>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </section>

          {/* 文本描述区域 */}
          <section className="text-section">
            <h2>📝 文本描述</h2>
            <div className="text-inputs">
              {textInputs.map((text, index) => (
                <div key={index} className="text-input-row">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateTextInput(index, e.target.value)}
                    placeholder={`文本描述 ${index + 1}`}
                    className="text-input"
                  />
                  {textInputs.length > 1 && (
                    <button
                      onClick={() => removeTextInput(index)}
                      className="remove-btn"
                      title="删除此项"
                    >
                      ❌
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="button-group">
              <button onClick={addTextInput} className="add-btn">
                ➕ 添加文本描述
              </button>
              <button 
                onClick={analyzeImage} 
                disabled={loading || !selectedImage}
                className="analyze-btn"
              >
                {loading ? '🔄 分析中...' : '🚀 开始分析'}
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
          </section>
        </div>

        {/* 结果显示区域 */}
        {results.length > 0 && (
          <section className="results-section">
            <h2>📊 分析结果</h2>
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className="result-item">
                  <span className="result-text">{result.text}</span>
                  <div className="result-score">
                    <div className="score-bar">
                      <div 
                        className="score-fill" 
                        style={{ width: `${result.score * 100}%` }}
                      ></div>
                    </div>
                    <span className="score-text">
                      {(result.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;