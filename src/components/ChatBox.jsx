import React, { useState, useEffect, useRef } from 'react';

const THREAD_ID = "your-roll-number"; // Replace with your actual threadId

function ChatBox() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi! Ask me about the weather 🌤️' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const extractCityFromInput = (text) => {
    const regex = /weather.*in\s+([\w\s]+)/i;
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);

    const city = extractCityFromInput(input);
    if (!city) {
      setMessages((prev) => [...prev, { sender: 'bot', text: '❌ Please mention a city name like "What’s the weather in Mumbai?"' }]);
      setInput('');
      return;
    }

    const botMessage = { sender: 'bot', text: `🔍 Checking weather for "${city}"...` };
    setMessages((prev) => [...prev, botMessage]);
    setInput('');

    try {
      const response = await fetch(
        `https://brief-thousands-sunset-9fcb1c78-485f-4967-ac04-2759a8fa1462.mastra.cloud/api/agents/weatherAgent/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [userMessage],
            runId: "weatherAgent",
            threadId: THREAD_ID,
            resourceId: "weatherAgent",
            maxRetries: 2,
            maxSteps: 5,
            temperature: 0.5,
            topP: 1,
            runtimeContext: {
              location: city
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("API returned non-OK response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let agentMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawChunk = decoder.decode(value, { stream: true });
        agentMessage += rawChunk;
      }

      if (!agentMessage) {
        agentMessage = "❌ City not found.";
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: agentMessage }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { sender: 'bot', text: '❌ Something went wrong. Try again.' }]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Chat display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`max-w-[75%] p-3 rounded-xl shadow-sm ${
              msg.sender === 'user'
                ? 'ml-auto bg-blue-500 text-white'
                : 'mr-auto bg-gray-100 text-black'
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="flex border-t p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the weather..."
          className="flex-grow px-4 py-2 rounded-l-full border border-gray-300 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-5 rounded-r-full hover:bg-blue-600 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
