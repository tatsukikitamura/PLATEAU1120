// Chatbot API calls service
export default class ChatbotService {
  constructor(getCsrfToken = () => document.querySelector('meta[name="csrf-token"]').content) {
    this.getCsrfToken = getCsrfToken;
  }

  async selectData(userMessage) {
    try {
      const response = await fetch('/api/chatbot/select_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCsrfToken()
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
    try {
      const response = await fetch('/api/chatbot/generate_response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCsrfToken()
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
}


