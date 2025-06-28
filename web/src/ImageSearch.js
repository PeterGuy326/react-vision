import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ImageSearch.css';

function ImageSearch({ onModeChange }) {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files]);
    }
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const addMessage = (type, content, isUser = true) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      isUser,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async () => {
    if (!currentInput.trim() && selectedImages.length === 0) {
      return;
    }

    // 添加用户消息
    if (currentInput.trim()) {
      addMessage('text', currentInput.trim(), true);
    }
    if (selectedImages.length > 0) {
      addMessage('images', selectedImages, true);
    }

    const query = currentInput.trim();
    const images = [...selectedImages];
    
    // 清空输入
    setCurrentInput('');
    setSelectedImages([]);
    
    if (!query || images.length === 0) {
      addMessage('text', '请提供搜索文本和图片才能进行搜索', false);
      return;
    }

    setLoading(true);
    addMessage('text', '正在搜索匹配的图片...', false);

    try {
      const formData = new FormData();
      formData.append('text_query', query);
      
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await axios.post('/api/search_images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.results) {
        addMessage('results', response.data.results, false);
      } else if (response.data.error) {
        addMessage('text', `搜索出错：${response.data.error}`, false);
      } else {
        addMessage('text', '搜索出现未知错误', false);
      }
    } catch (err) {
      console.error('搜索错误:', err);
      if (err.response && err.response.data && err.response.data.error) {
        addMessage('text', `搜索出错：${err.response.data.error}`, false);
      } else {
        addMessage('text', '网络错误或服务器无响应，请确保后端服务正在运行', false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearImages = () => {
    setSelectedImages([]);
  };

  const renderMessage = (message) => {
    const { id, type, content, isUser, timestamp } = message;
    
    return (
      <div key={id} className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
        <div className="message-content">
          {type === 'text' && (
            <div className="text-content">{content}</div>
          )}
          {type === 'images' && (
            <div className="images-content">
              <div className="images-grid">
                {content.map((image, index) => {
                  const imageUrl = URL.createObjectURL(image);
                  return (
                    <div key={index} className="message-image">
                      <img src={imageUrl} alt={image.name} />
                      <span className="image-name">{image.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {type === 'results' && (
            <div className="results-content">
              <div className="results-header">
                🎯 找到 {content.length} 张匹配图片
              </div>
              <div className="results-list">
                {content.map((result, index) => (
                  <div key={index} className="result-card">
                    <div className="result-rank">#{index + 1}</div>
                    <div className="result-image-container">
                      <img 
                        src={result.image_data} 
                        alt={result.image_name} 
                        className="result-image"
                      />
                    </div>
                    <div className="result-details">
                      <div className="result-name">{result.image_name}</div>
                      <div className="result-score">
                        <div className="score-bar">
                          <div 
                            className="score-fill" 
                            style={{ width: `${result.probability * 100}%` }}
                          ></div>
                        </div>
                        <span className="score-text">
                          {(result.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="message-time">{timestamp}</div>
      </div>
    );
  };

  return (
    <div className="image-search-chat">
      <header className="chat-header">
        <button 
          onClick={() => onModeChange && onModeChange('analyze')}
          className="back-btn"
        >
          ← 返回分析模式
        </button>
        <h1>🔍 智能图片搜索</h1>
        <p>发送文本和图片，AI帮你找到最匹配的图片</p>
      </header>

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-icon">🤖</div>
              <h3>欢迎使用智能图片搜索</h3>
              <p>请上传图片并输入搜索描述，我会帮你找到最匹配的图片</p>
            </div>
          )}
          {messages.map(renderMessage)}
          {loading && (
            <div className="message bot-message">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {selectedImages.length > 0 && (
            <div className="selected-images">
              <div className="images-preview">
                {selectedImages.map((image, index) => {
                  const imageUrl = URL.createObjectURL(image);
                  return (
                    <div key={index} className="preview-image">
                      <img src={imageUrl} alt={image.name} />
                      <button
                        onClick={() => removeImage(index)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <button onClick={clearImages} className="clear-images-btn">
                清空图片
              </button>
            </div>
          )}
          
          <div className="input-controls">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="upload-btn"
              title="上传图片"
            >
              📎
            </button>
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入搜索描述，例如：一只可爱的小猫、红色的汽车..."
              className="message-input"
              rows={1}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || (!currentInput.trim() && selectedImages.length === 0)}
              className="send-btn"
            >
              {loading ? '⏳' : '🚀'}
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}

export default ImageSearch;