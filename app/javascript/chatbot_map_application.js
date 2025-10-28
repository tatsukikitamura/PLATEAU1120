// Chatbot Map Integration
// AIチャットbotと3Dマップの統合アプリケーション
import { renderMarkdown } from "markdown_renderer";

console.log("📦 chatbot_map_application.js モジュールがロードされました");

// DOMが読み込まれた後に実行
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Chatbot Map application starting...");

  // Cesiumライブラリの読み込み完了を待つ関数
  function waitForCesium() {
    return new Promise((resolve) => {
      if (window.Cesium) {
        resolve();
      } else {
        const checkCesium = () => {
          if (window.Cesium) {
            resolve();
          } else {
            setTimeout(checkCesium, 100);
          }
        };
        checkCesium();
      }
    });
  }

  // Cesiumライブラリの読み込み完了を待つ
  await waitForCesium();
  
  const Cesium = window.Cesium;

  if (!Cesium) {
    console.error(
      "Cesiumライブラリが読み込まれていません。レイアウトファイルのscriptタグを確認してください。"
    );
    return;
  }

  // Cesium Base URLの設定
  window.CESIUM_BASE_URL =
    "https://cesium.com/downloads/cesiumjs/releases/1.134/Build/Cesium/";

  console.log("Cesium loaded successfully");

  // Cesium Ion アクセストークンの設定
  const accessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmMWU2NjU3Mi1jZjdkLTQxYzQtODIyNS1lZGQ5YmIwOTRmNzYiLCJpZCI6MzQ3NTk0LCJpYXQiOjE3NjA2NzkzOTF9.J6Eo9oYzvX08PzLdmtESdmPZnZF09IKP9bmmuQRsGdk";
  if (accessToken) {
    Cesium.Ion.defaultAccessToken = accessToken;
    console.log("Cesium Ion アクセストークンが設定されました");
  }

  // Cesiumビューアーの初期化
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
  });

  // カメラの初期位置設定（千葉県付近）
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(140.12, 35.6, 400),
  });

  // グローバルにビューアーを保存（チャット側からアクセス可能に）
  window.cesiumViewer = viewer;

  // モジュールのインポート
  const { loadGeoJSON } = await import("plateau/cesium/geojson_loader");
  const { loadGoogleMapsPlaces, loadGoogleMapsGeocode, loadGoogleMapsDirections } = await import("plateau/cesium/google_maps_loader");
  window.loadGeoJSONToMap = loadGeoJSON;
  window.loadGoogleMapsPlaces = loadGoogleMapsPlaces;
  window.loadGoogleMapsGeocode = loadGoogleMapsGeocode;
  window.loadGoogleMapsDirections = loadGoogleMapsDirections;

  // Cesiumビューアーの初期化完了
  console.log("Cesium viewer initialized successfully");
  
  /**
   * チャットbot機能の初期化
   * @param {Cesium.Viewer} viewer - Cesiumビューアー
   * @param {Function} loadGeoJSON - GeoJSON読み込み関数
   */
  function initializeChatbot(viewer, loadGeoJSON) {
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const clearMapBtn = document.getElementById('clearMapBtn');
  
  // Check if elements exist
  if (!chatMessages || !chatForm) {
    return;
  }
  
  // Message ID counter
  let messageId = 0;
  
  // Chat history to maintain context
  let chatHistory = [];
  
  // Add message to chat
  function addMessage(text, isUser = false, isHtml = false) {
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
    
    // HTML、テキスト、またはマークダウンとして設定
    if (isHtml) {
      messageText.innerHTML = text;
    } else if (!isUser) {
      // ボットメッセージの場合はマークダウンをレンダリング
      messageText.innerHTML = renderMarkdown(text);
    } else {
      // ユーザーメッセージはテキストそのまま
      messageText.textContent = text;
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
  
  // Update typing indicator with status message
  function updateTypingIndicator(message) {
    const indicator = document.getElementById('typing-indicator');
    if (!indicator) return;
    
    const content = indicator.querySelector('.message-content');
    if (!content) return;
    
    content.innerHTML = `<div style="color: #667eea; font-weight: bold;">${message}</div>`;
    scrollToBottom();
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
  
  // Show data selection as a message with map display button
  function showDataSelectionMessage(selectedData, shouldDisplayOnMap) {
    let messageHtml = '<div style="padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #667eea;">';
    messageHtml += '<div style="font-weight: bold; margin-bottom: 0.75rem; color: #667eea;">📊 関連データを選択しました</div>';
    
    if (selectedData && selectedData.length > 0) {
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
      
      // マップに表示する必要がある場合、ボタンを表示
      if (shouldDisplayOnMap) {
        messageHtml += `<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ddd;">`;
        messageHtml += `<button class="btn btn-primary btn-sm" data-selected-data='${JSON.stringify(selectedData)}' style="width: 100%; background-color: #667eea; border-color: #667eea; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
          <i class="fas fa-map-marker-alt me-2"></i>マップに表示
        </button>`;
        messageHtml += `</div>`;
      } else {
        messageHtml += '<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #ddd; font-style: italic; color: #888; font-size: 0.9rem;">✨ 選択されたデータに基づいて回答を生成しています...</div>';
      }
    } else {
      messageHtml += '<div style="color: #666;">全データを使用して回答します</div>';
    }
    
    messageHtml += '</div>';
    return messageHtml;
  }
  
  // Plot selected data to map
  function plotDataToMap(selectedData) {
    if (!selectedData || selectedData.length === 0) {
      return;
    }
    
    // データタイプごとにGeoJSONパスを構築
    const urlsToLoad = [];
    
    selectedData.forEach(data => {
      // データタイプと名前からGeoJSONパスを生成
      const url = `/data/geoJSON/${data.data_type}/${data.name}.geojson`;
      urlsToLoad.push(url);
    });
    
    if (urlsToLoad.length > 0) {
      loadGeoJSON(viewer, urlsToLoad);
    }
  }
  
  // Call Google Maps API based on query
  async function callGoogleMapsAPI(viewer, query) {
    if (!query || !query.type) {
      console.error('❌ クエリが無効です:', query);
      return;
    }
    
    try {
      switch (query.type) {
        case 'places':
          await window.loadGoogleMapsPlaces(viewer, {
            query: query.query,
            location: query.params?.location,
            radius: query.params?.radius || 5000,
            type: query.params?.type
          });
          break;
          
        case 'geocode':
          await window.loadGoogleMapsGeocode(viewer, query.query);
          break;
          
        case 'directions':
          await window.loadGoogleMapsDirections(viewer, {
            origin: query.params?.origin,
            destination: query.params?.destination,
            mode: query.params?.mode || 'driving'
          });
          break;
          
        default:
          console.error('❌ 未知のクエリタイプ:', query.type);
      }
    } catch (error) {
      console.error('❌ Google Maps API呼び出しエラー:', error);
    }
  }
  
  // Call data selection API
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
      
      // AI判定結果を簡潔に表示
      if (data.should_display_on_map || data.should_use_google_maps) {
        console.log('🗺️ AI判定:', {
          display: data.should_display_on_map ? 'マップ表示' : '表示不要',
          google_maps: data.should_use_google_maps ? '使用' : '不要',
          data_count: data.selected_data?.length || 0
        });
      }
      
      if (data.success && data.selected_data) {
        return {
          selected_data: data.selected_data,
          should_display_on_map: data.should_display_on_map || false,
          should_use_google_maps: data.should_use_google_maps || false,
          google_maps_query: data.google_maps_query
        };
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Data selection API error:', error);
      return { selected_data: null, should_display_on_map: false, should_use_google_maps: false, google_maps_query: null };
    }
  }
  
  // Call AI response generation API
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
      console.error('AI response generation error:', error);
      return `申し訳ございません。エラーが発生しました: ${error.message}`;
    }
  }
  
  // Main chatbot API call with 2-stage process
  async function callChatbotAPI(userMessage) {
    try {
      chatHistory.push({ role: 'user', content: userMessage });
      
      // 1段階目: データ選択
      updateTypingIndicator('📊 関連データを選択しています...');
      const selectionResult = await selectData(userMessage);
      
      const selectedData = selectionResult?.selected_data || null;
      const shouldDisplayOnMap = selectionResult?.should_display_on_map || false;
      const shouldUseGoogleMaps = selectionResult?.should_use_google_maps || false;
      const googleMapsQuery = selectionResult?.google_maps_query || null;
      
      // PLATEAUデータがある場合の処理
      if (selectedData && selectedData.length > 0) {
        // データ選択結果を表示（shouldDisplayOnMapフラグとともに、HTMLとして表示）
        const messageDiv = addMessage(showDataSelectionMessage(selectedData, shouldDisplayOnMap), false, true);
        
        // ボタンにイベントリスナーを追加
        if (shouldDisplayOnMap) {
          setTimeout(() => {
            const button = messageDiv.querySelector('.message-text button');
            
            if (button) {
              const dataToPlot = JSON.parse(button.getAttribute('data-selected-data'));
              
              button.addEventListener('click', function() {
                plotDataToMap(dataToPlot);
                this.innerHTML = '<i class="fas fa-check me-2"></i>表示済み';
                this.disabled = true;
                this.style.background = '#28a745';
                this.style.borderColor = '#28a745';
              });
            }
          }, 100);
        }
      }
      
      // Google Maps APIが必要な場合の処理
      if (shouldUseGoogleMaps && googleMapsQuery) {
        // チャットにGoogle Maps表示ボタンを追加
        const googleMapsMessage = `
          <div style="margin: 10px 0;">
            <p>🗺️ Google Mapsデータを見つけました。</p>
            <button class="btn btn-primary" data-google-maps-query='${JSON.stringify(googleMapsQuery)}'>
              <i class="fas fa-map-marker-alt me-2"></i>マップに表示
            </button>
          </div>
        `;
        const googleMapsMessageDiv = addMessage(googleMapsMessage, false, true);
        
        // ボタンにイベントリスナーを追加
        setTimeout(() => {
          const button = googleMapsMessageDiv.querySelector('.message-text button');
          
          if (button) {
            button.addEventListener('click', async function() {
              const queryData = JSON.parse(this.getAttribute('data-google-maps-query'));
              
              try {
                await callGoogleMapsAPI(viewer, queryData);
                this.innerHTML = '<i class="fas fa-check me-2"></i>表示済み';
                this.disabled = true;
                this.style.background = '#28a745';
                this.style.borderColor = '#28a745';
              } catch (error) {
                console.error('Google Maps表示エラー:', error);
                alert('マップの表示に失敗しました: ' + error.message);
              }
            });
          }
        }, 100);
      }
      
      // 2段階目: AI回答生成
      updateTypingIndicator('✨ AI回答を生成しています...');
      const aiResponse = await generateResponse(chatHistory, selectedData, googleMapsQuery);
      
      chatHistory.push({ role: 'assistant', content: aiResponse });
      
      return {
        response: aiResponse,
        selected_data: selectedData,
        should_display_on_map: shouldDisplayOnMap,
        should_use_google_maps: shouldUseGoogleMaps
      };
    } catch (error) {
      console.error('Chatbot API error:', error);
      return {
        response: `申し訳ございません。エラーが発生しました: ${error.message}`,
        selected_data: null,
        should_display_on_map: false,
        should_use_google_maps: false
      };
    }
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
    
    // Call chatbot API
    try {
      const result = await callChatbotAPI(message);
      removeTypingIndicator();
      
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
  
  // Handle clear chat button
  clearChatBtn.addEventListener('click', async function() {
    if (confirm('チャット履歴を削除しますか？')) {
      const welcomeMessage = chatMessages.querySelector('.bot-message');
      chatMessages.innerHTML = '';
      chatMessages.appendChild(welcomeMessage);
      messageId = 0;
      chatHistory = [];
      
      // マップ上のデータも同時にクリア
      const { clearGeoJSONDataSources } = await import('plateau/utils/data_manager');
      const { clearGoogleMapsData } = await import('plateau/cesium/google_maps_loader');
      
      clearGeoJSONDataSources(viewer);
      clearGoogleMapsData(viewer);
      console.log('チャット履歴とマップデータをクリアしました');
    }
  });
  
  // Handle clear map button
  clearMapBtn.addEventListener('click', async function() {
    const { clearGeoJSONDataSources } = await import('plateau/utils/data_manager');
    clearGeoJSONDataSources(viewer);
    console.log('マップをクリアしました');
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
  }

  // チャットbot機能の初期化
  initializeChatbot(viewer, loadGeoJSON);
});