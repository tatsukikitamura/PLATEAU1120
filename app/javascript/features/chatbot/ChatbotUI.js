// Chatbot UI functionality
import { renderMarkdown } from "services/markdown";

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
    // Tailwind化: 表示用はユーティリティ、判定用に既存クラスも保持
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'} mb-6 flex ${isUser ? 'flex-row-reverse' : ''}`;
    messageDiv.id = `message-${this.messageId++}`;

    const avatar = document.createElement('div');
    avatar.className = `message-avatar h-9 w-9 rounded-full flex items-center justify-center text-[1.1rem] flex-shrink-0 ${isUser ? 'ml-3 bg-gradient-to-br from-indigo-600 to-purple-500 text-white' : 'mr-3 bg-gradient-to-br from-green-600 to-teal-400 text-white'}`;
    avatar.innerHTML = `<i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>`;

    const content = document.createElement('div');
    content.className = 'message-content flex-1 min-w-0';

    const header = document.createElement('div');
    header.className = 'message-header mb-2 flex items-center justify-between text-[0.85rem]';
    header.innerHTML = `
      <strong class="text-gray-800">${isUser ? 'あなた' : 'AIアシスタント'}</strong>
      <span class="timestamp text-xs text-gray-500">${this.getTimestamp()}</span>
    `;

    const messageText = document.createElement('div');
    messageText.className = `message-text rounded-lg px-3 py-2 leading-relaxed ${isUser ? 'bg-gradient-to-br from-indigo-600 to-purple-500 text-white' : 'bg-gray-100 text-gray-800'}`;

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
    messageDiv.className = 'message bot-message mb-4 flex';
    messageDiv.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar mr-3 h-9 w-9 rounded-full bg-gradient-to-br from-green-600 to-teal-400 text-white flex items-center justify-center text-[1.1rem]';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content flex-1 min-w-0';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator flex items-center py-2';
    typingIndicator.innerHTML = `
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-500 mr-1 animate-bounce"></span>
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-500 mr-1 animate-bounce" style="animation-delay: 0.2s"></span>
      <span class="inline-block h-1.5 w-1.5 rounded-full bg-gray-500 mr-1 animate-bounce" style="animation-delay: 0.4s"></span>
    `;

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
    content.innerHTML = `<div class="text-indigo-600 font-bold">${message}</div>`;
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
                  btn.innerHTML = '<i class="fas fa-check mr-2"></i>表示済み';
                  btn.disabled = true;
                  btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                  btn.classList.add('bg-green-600', 'hover:bg-green-600', 'cursor-default');
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
                btn.innerHTML = '<i class="fas fa-check mr-2"></i>表示済み';
                btn.disabled = true;
                btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
                btn.classList.add('bg-green-600', 'hover:bg-green-600', 'cursor-default');
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
    let html = '<div class="p-4 bg-blue-50 rounded-lg border-l-4 border-indigo-500">';
    html += '<div class="font-bold mb-3 text-indigo-600">📊 関連データを選択しました</div>';
    if (selectedData && selectedData.length > 0) {
      const grouped = {};
      selectedData.forEach(d => {
        if (!grouped[d.data_type]) grouped[d.data_type] = [];
        grouped[d.data_type].push(d);
      });
      Object.keys(grouped).forEach(t => {
        html += `<div class=\"mb-2\"><strong class=\"text-gray-800\">${t}:</strong>`;
        grouped[t].forEach(d => {
          html += `<div class=\"ml-4 text-gray-600 mt-1\">• ${d.name}</div>`;
        });
        html += '</div>';
      });
      if (shouldDisplayOnMap) {
        html += `<div class=\"mt-3 pt-3 border-t border-gray-200\">`;
        html += `<button class=\"w-full inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white text-sm shadow hover:bg-indigo-700\" data-selected-data='${JSON.stringify(selectedData)}'>`;
        html += `<i class=\"fas fa-map-marker-alt mr-2\"></i>マップに表示`;
        html += `</button></div>`;
      } else {
        html += '<div class="mt-3 pt-3 border-t border-gray-200 italic text-gray-500 text-sm">✨ 選択されたデータに基づいて回答を生成しています...</div>';
      }
    } else {
      html += '<div class="text-gray-600">全データを使用して回答します</div>';
    }
    html += '</div>';
    return html;
  }

  buildGoogleMapsActionHtml(googleMapsQuery) {
    return `
      <div class="my-2">
        <p class="mb-2">🗺️ Google Mapsデータを見つけました。</p>
        <button class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700" data-google-maps-query='${JSON.stringify(googleMapsQuery)}'>
          <i class="fas fa-map-marker-alt mr-2"></i>マップに表示
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
          this.chatMessages.innerHTML = '';
          // Tailwind用に既存のメッセージ生成ロジックを使用してウェルカムを再挿入
          this.addMessage(
            'こんにちは！千葉市の地理空間データに関する質問にお答えします。<br>回答したデータは自動的に右側のマップに表示されます。',
            false
          );
          this.messageId = 0;
          this.chatHistory = [];
          // マップや外部表示データもクリア（オプション）
          if (this.options && typeof this.options.onClear === 'function') {
            try { this.options.onClear(); } catch (_) {}
          }
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


