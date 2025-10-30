// Chatbot UI functionality
import { renderMarkdown } from "markdown_renderer";

export default class ChatbotUI {
  constructor(elements, options = {}) {
    this.chatMessages = elements.chatMessages;
    this.chatForm = elements.chatForm;
    this.messageInput = elements.messageInput;
    this.sendBtn = elements.sendBtn;
    this.clearChatBtn = elements.clearChatBtn;
    this.sampleQuestionButtons = elements.sampleQuestionButtons || [];
    this.options = options;
    this.messageId = 0;
    this.chatHistory = [];
    this.chatbotService = options.chatbotService || null;

    if (!this.chatMessages || !this.chatForm || !this.messageInput || !this.sendBtn) {
      console.warn("ChatbotUI: 必要なDOM要素が不足しています");
      return;
    }

    this.bindEvents();
    this.messageInput.focus();
    console.log('Chatbot initialized');
  }

  addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    messageDiv.id = `message-${this.messageId++}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = `<i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>`;

    const content = document.createElement('div');
    content.className = 'message-content';

    const header = document.createElement('div');
    header.className = 'message-header';
    header.innerHTML = `
      <strong>${isUser ? 'あなた' : 'AIアシスタント'}</strong>
      <span class="timestamp">${this.getTimestamp()}</span>
    `;

    const messageText = document.createElement('div');
    messageText.className = 'message-text';

    if (isUser) {
      messageText.textContent = text;
    } else {
      messageText.innerHTML = renderMarkdown(text);
    }

    content.appendChild(header);
    content.appendChild(messageText);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();

    return messageDiv;
  }

  showTypingIndicator() {
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
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
    return messageDiv;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  updateTypingIndicator(message) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    const content = indicator.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = `<div style="color: #667eea; font-weight: bold;">${message}</div>`;
    this.scrollToBottom();
  }

  getTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  async selectData(userMessage) {
    if (this.chatbotService && typeof this.chatbotService.selectData === 'function') {
      return await this.chatbotService.selectData(userMessage);
    }
    try {
      const response = await fetch('/api/chatbot/select_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ user_query: userMessage })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success) {
        return {
          selected_data: data.selected_data || [],
          should_display_on_map: data.should_display_on_map || false,
          should_use_google_maps: data.should_use_google_maps || false,
          google_maps_query: data.google_maps_query || null
        };
      }
      throw new Error(data.error || 'Unknown error occurred');
    } catch (error) {
      console.error('Data selection API error:', error);
      return { selected_data: null, should_display_on_map: false, should_use_google_maps: false, google_maps_query: null };
    }
  }

  async generateResponse(messages, selectedData, googleMapsQuery = null) {
    if (this.chatbotService && typeof this.chatbotService.generateResponse === 'function') {
      return await this.chatbotService.generateResponse(messages, selectedData, googleMapsQuery);
    }
    try {
      const response = await fetch('/api/chatbot/generate_response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          messages,
          selected_data: selectedData,
          google_maps_query: googleMapsQuery
        })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success && data.response) return data.response;
      throw new Error(data.error || 'Unknown error occurred');
    } catch (error) {
      console.error('Response generation API error:', error);
      return `申し訳ございません。エラーが発生しました: ${error.message}`;
    }
  }

  async callChatbotAPI(userMessage) {
    try {
      this.chatHistory.push({ role: 'user', content: userMessage });
      this.updateTypingIndicator('📊 関連データを選択しています...');
      const selectionResult = await this.selectData(userMessage);
      const selectedData = selectionResult?.selected_data || null;
      const shouldDisplayOnMap = selectionResult?.should_display_on_map || false;
      const shouldUseGoogleMaps = selectionResult?.should_use_google_maps || false;
      const googleMapsQuery = selectionResult?.google_maps_query || null;
      if (selectedData && selectedData.length > 0) {
        const html = this.buildDataSelectionHtml(selectedData, shouldDisplayOnMap);
        const msgDiv = this.addMessage(html, false);
        if (shouldDisplayOnMap) {
          setTimeout(() => {
            const btn = msgDiv.querySelector('.message-text button[data-selected-data]');
            if (btn) {
              btn.addEventListener('click', () => {
                try {
                  const payload = JSON.parse(btn.getAttribute('data-selected-data'));
                  if (this.options.onPlotSelectedData) {
                    this.options.onPlotSelectedData(payload);
                  }
                  btn.innerHTML = '<i class="fas fa-check me-2"></i>表示済み';
                  btn.disabled = true;
                  btn.style.background = '#28a745';
                  btn.style.borderColor = '#28a745';
                } catch (_) {}
              });
            }
          }, 50);
        }
      }
      if (shouldUseGoogleMaps && googleMapsQuery) {
        const html = this.buildGoogleMapsActionHtml(googleMapsQuery);
        const gDiv = this.addMessage(html, false);
        setTimeout(() => {
          const btn = gDiv.querySelector('.message-text button[data-google-maps-query]');
          if (btn) {
            btn.addEventListener('click', async () => {
              try {
                const query = JSON.parse(btn.getAttribute('data-google-maps-query'));
                if (this.options.onGoogleMapsQuery) {
                  await this.options.onGoogleMapsQuery(query);
                }
                btn.innerHTML = '<i class="fas fa-check me-2"></i>表示済み';
                btn.disabled = true;
                btn.style.background = '#28a745';
                btn.style.borderColor = '#28a745';
              } catch (e) {
                alert('マップの表示に失敗しました: ' + e.message);
              }
            });
          }
        }, 50);
      }
      this.updateTypingIndicator('✨ AI回答を生成しています...');
      const aiResponse = await this.generateResponse(this.chatHistory, selectedData, googleMapsQuery);
      this.chatHistory.push({ role: 'assistant', content: aiResponse });
      return { response: aiResponse, selected_data: selectedData };
    } catch (error) {
      console.error('Chatbot API error:', error);
      return { response: `申し訳ございません。エラーが発生しました: ${error.message}`, selected_data: null };
    }
  }

  showDataSelectionMessage(selectedData) {
    let messageHtml = '<div style="padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #667eea;">';
    messageHtml += '<div style="font-weight: bold; margin-bottom: 0.75rem; color: #667eea;">📊 関連データを選択しました</div>';
    if (selectedData && selectedData.length > 0) {
      const grouped = {};
      selectedData.forEach(data => {
        if (!grouped[data.data_type]) grouped[data.data_type] = [];
        grouped[data.data_type].push(data);
      });
      Object.keys(grouped).forEach(dataType => {
        messageHtml += `<div style=\"margin-bottom: 0.5rem;\"><strong style=\"color: #333;\">${dataType}:</strong>`;
        grouped[dataType].forEach(data => {
          messageHtml += `<div style=\"margin-left: 1rem; color: #666; margin-top: 0.25rem;\">• ${data.name}</div>`;
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

  buildDataSelectionHtml(selectedData, shouldDisplayOnMap) {
    let html = '<div style="padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #667eea;">';
    html += '<div style="font-weight: bold; margin-bottom: 0.75rem; color: #667eea;">📊 関連データを選択しました</div>';
    if (selectedData && selectedData.length > 0) {
      const grouped = {};
      selectedData.forEach(d => {
        if (!grouped[d.data_type]) grouped[d.data_type] = [];
        grouped[d.data_type].push(d);
      });
      Object.keys(grouped).forEach(t => {
        html += `<div style=\"margin-bottom: 0.5rem;\"><strong style=\"color: #333;\">${t}:</strong>`;
        grouped[t].forEach(d => {
          html += `<div style=\"margin-left: 1rem; color: #666; margin-top: 0.25rem;\">• ${d.name}</div>`;
        });
        html += '</div>';
      });
      if (shouldDisplayOnMap) {
        html += `<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ddd;">`;
        html += `<button class="btn btn-primary btn-sm" data-selected-data='${JSON.stringify(selectedData)}' style="width: 100%; background-color: #667eea; border-color: #667eea; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">`;
        html += `<i class=\"fas fa-map-marker-alt me-2\"></i>マップに表示`;
        html += `</button></div>`;
      } else {
        html += '<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ddd; font-style: italic; color: #888; font-size: 0.9rem;">✨ 選択されたデータに基づいて回答を生成しています...</div>';
      }
    } else {
      html += '<div style="color: #666;">全データを使用して回答します</div>';
    }
    html += '</div>';
    return html;
  }

  buildGoogleMapsActionHtml(googleMapsQuery) {
    return `
      <div style="margin: 10px 0;">
        <p>🗺️ Google Mapsデータを見つけました。</p>
        <button class="btn btn-primary" data-google-maps-query='${JSON.stringify(googleMapsQuery)}'>
          <i class="fas fa-map-marker-alt me-2"></i>マップに表示
        </button>
      </div>
    `;
  }

  bindEvents() {
    this.chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = this.messageInput.value.trim();
      if (!message) return;
      this.addMessage(message, true);
      this.messageInput.value = '';
      this.sendBtn.disabled = true;
      this.messageInput.disabled = true;
      this.showTypingIndicator();
      try {
        const result = await this.callChatbotAPI(message);
        this.removeTypingIndicator();
        const responseText = result.response || result;
        this.addMessage(responseText);
      } catch (error) {
        this.removeTypingIndicator();
        this.addMessage(`エラー: ${error.message}`);
      }
      this.sendBtn.disabled = false;
      this.messageInput.disabled = false;
      this.messageInput.focus();
    });

    if (this.sampleQuestionButtons && this.sampleQuestionButtons.forEach) {
      this.sampleQuestionButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const question = btn.textContent.trim();
          this.messageInput.value = question.replace(/^"|"$/g, '');
          this.messageInput.focus();
          this.chatForm.dispatchEvent(new Event('submit'));
        });
      });
    }

    if (this.clearChatBtn) {
      this.clearChatBtn.addEventListener('click', () => {
        if (confirm('チャット履歴を削除しますか？')) {
          const welcomeMessage = this.chatMessages.querySelector('.bot-message');
          this.chatMessages.innerHTML = '';
          if (welcomeMessage) this.chatMessages.appendChild(welcomeMessage);
          this.messageId = 0;
          this.chatHistory = [];
        }
      });
    }

    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.chatForm.dispatchEvent(new Event('submit'));
      }
    });
  }
}


