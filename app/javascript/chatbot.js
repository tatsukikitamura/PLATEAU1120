// Chatbot UI functionality
import { renderMarkdown } from "markdown_renderer";

document.addEventListener('DOMContentLoaded', function() {
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  
  // Sample question buttons
  const sampleQuestionButtons = document.querySelectorAll('.sample-question-btn');
  
  // Check if elements exist (only run on chatbot page)
  if (!chatMessages || !chatForm) {
    return;
  }
  
  // Message ID counter
  let messageId = 0;
  
  // Add message to chat
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.id = `message-${messageId++}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = `
      <strong>${isUser ? 'あなた' : 'AIアシスタント'}</strong>
      <span class="timestamp">${getTimestamp()}</span>
    `;
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Render Markdown for bot messages, plain text for user messages
    if (isUser) {
      messageText.textContent = text;
    } else {
      messageText.innerHTML = renderMarkdown(text);
    }
    
    content.appendChild(header);
    content.appendChild(messageText);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
  }
  
  // Show typing indicator
  function showTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    
    content.appendChild(typingIndicator);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
  }
  
  // Remove typing indicator
  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  // Get timestamp
  function getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  // Scroll to bottom
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Chat history to maintain context
  let chatHistory = [];
  
  // Update typing indicator with status message
  function updateTypingIndicator(message) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    
    const content = indicator.querySelector('.message-content');
    if (!content) return;
    
    content.innerHTML = `<div style="color: #667eea; font-weight: bold;">${message}</div>`;
    scrollToBottom();
  }
  
  // Call data selection API (1段階目)
  async function selectData(userMessage) {
    try {
      const response = await fetch('/api/chatbot/select_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          user_query: userMessage
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return {
          selected_data: data.selected_data || [],
          should_display_on_map: data.should_display_on_map || false,
          should_use_google_maps: data.should_use_google_maps || false,
          google_maps_query: data.google_maps_query || null
        };
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Data selection API error:', error);
      return { selected_data: null, should_display_on_map: false, should_use_google_maps: false, google_maps_query: null };
    }
  }
  
  // Call AI response generation API (2段階目)
  async function generateResponse(messages, selectedData, googleMapsQuery = null) {
    try {
      const response = await fetch('/api/chatbot/generate_response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          messages: messages,
          selected_data: selectedData,
          google_maps_query: googleMapsQuery
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.response) {
        return data.response;
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Response generation API error:', error);
      return `申し訳ございません。エラーが発生しました: ${error.message}`;
    }
  }
  
  // Main chatbot API call with 2-stage process
  async function callChatbotAPI(userMessage) {
    try {
      // Add user message to history
      chatHistory.push({ role: 'user', content: userMessage });
      
      // 1段階目: データ選択
      updateTypingIndicator('📊 関連データを選択しています...');
      const selectionResult = await selectData(userMessage);
      
      const selectedData = selectionResult?.selected_data || null;
      const shouldDisplayOnMap = selectionResult?.should_display_on_map || false;
      const shouldUseGoogleMaps = selectionResult?.should_use_google_maps || false;
      const googleMapsQuery = selectionResult?.google_maps_query || null;
      
      if (selectedData && selectedData.length > 0) {
        // データ選択結果を表示
        addMessage(showDataSelectionMessage(selectedData));
      }
      
      // 2段階目: AI回答生成
      updateTypingIndicator('✨ AI回答を生成しています...');
      const aiResponse = await generateResponse(chatHistory, selectedData, googleMapsQuery);
      
      // Add bot response to history
      chatHistory.push({ role: 'assistant', content: aiResponse });
      
      return {
        response: aiResponse,
        selected_data: selectedData
      };
    } catch (error) {
      console.error('Chatbot API error:', error);
      return {
        response: `申し訳ございません。エラーが発生しました: ${error.message}`,
        selected_data: null
      };
    }
  }
  
  // Show data selection as a message
  function showDataSelectionMessage(selectedData) {
    let messageHtml = '<div style="padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #667eea;">';
    messageHtml += '<div style="font-weight: bold; margin-bottom: 0.75rem; color: #667eea;">📊 関連データを選択しました</div>';
    
    if (selectedData && selectedData.length > 0) {
      // データタイプごとにグループ化
      const grouped = {};
      selectedData.forEach(data => {
        if (!grouped[data.data_type]) {
          grouped[data.data_type] = [];
        }
        grouped[data.data_type].push(data);
      });
      
      Object.keys(grouped).forEach(dataType => {
        messageHtml += `<div style="margin-bottom: 0.5rem;"><strong style="color: #333;">${dataType}:</strong>`;
        grouped[dataType].forEach(data => {
          messageHtml += `<div style="margin-left: 1rem; color: #666; margin-top: 0.25rem;">• ${data.name}</div>`;
        });
        messageHtml += '</div>';
      });
      
      messageHtml += '<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ddd; font-style: italic; color: #888; font-size: 0.9rem;">✨ 選択されたデータに基づいて回答を生成しています...</div>';
    } else {
      messageHtml += '<div style="color: #666;">全データを使用して回答します</div>';
    }
    
    messageHtml += '</div>';
    return messageHtml;
  }

  // Handle form submission
  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    
    // Disable input while waiting
    sendBtn.disabled = true;
    messageInput.disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Call chatbot API (2段階の処理を含む)
    try {
      const result = await callChatbotAPI(message);
      removeTypingIndicator();
      
      // 最終応答を表示（データ選択結果は既にcallChatbotAPI内で表示済み）
      const responseText = result.response || result;
      addMessage(responseText);
    } catch (error) {
      removeTypingIndicator();
      addMessage(`エラー: ${error.message}`);
    }
    
    // Re-enable input
    sendBtn.disabled = false;
    messageInput.disabled = false;
    messageInput.focus();
  });
  
  // Handle sample question buttons
  sampleQuestionButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const question = this.textContent.trim();
      messageInput.value = question.replace(/^"|"$/g, '');
      messageInput.focus();
      
      // Auto-submit
      chatForm.dispatchEvent(new Event('submit'));
    });
  });
  
  // Handle clear chat button
  clearChatBtn.addEventListener('click', function() {
    if (confirm('チャット履歴を削除しますか？')) {
      // Keep only the welcome message
      const welcomeMessage = chatMessages.querySelector('.bot-message');
      chatMessages.innerHTML = '';
      chatMessages.appendChild(welcomeMessage);
      messageId = 0;
      
      // Clear chat history
      chatHistory = [];
    }
  });
  
  // Auto-focus input
  messageInput.focus();
  
  // Allow Enter to submit (Shift+Enter for new line)
  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });
  
  console.log('Chatbot initialized');
});

