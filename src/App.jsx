import React, { useState, useRef, useEffect } from "react";
import "./App.css";

const App = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      role: "user",
      content: input,
      time: formatTime(new Date()),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const controller = new AbortController();

    const res = await fetch(
      "https://millions-screeching-vultur.mastra.cloud/api/agents/weatherAgent/stream",
      {
        method: "POST",
        headers: {
          "x-mastra-dev-playground": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }],
          runId: "weatherAgent",
          maxRetries: 2,
          maxSteps: 5,
          temperature: 0.5,
          topP: 1,
          runtimeContext: {},
          threadId: 2021016402117922,
          resourceId: "weatherAgent",
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Error fetching weather. Please try again.",
          time: formatTime(new Date()),
        },
      ]);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let finalText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (let line of lines) {
        const jsonStr = line.slice(2);
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.result) {
            const {
              temperature,
              feelsLike,
              humidity,
              windSpeed,
              windGust,
              conditions,
              location,
            } = parsed.result;

            finalText = `📍 Weather in ${location}\n🌡️ Temperature: ${temperature}°C (feels like ${feelsLike}°C)\n🌧️ Conditions: ${conditions}\n💧 Humidity: ${humidity}%\n💨 Wind: ${windSpeed} km/h, gusts up to ${windGust} km/h`;
          } else if (parsed.content) {
            finalText += parsed.content;
          }
        } catch (_) {
          // skip invalid JSON
        }
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: finalText.trim() || "❌ No response received.",
        time: formatTime(new Date()),
      },
    ]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`chat-container ${darkMode ? "dark" : "light"}`}>
      <header className="chat-header">
        <h1>🌤️ Weather Chat</h1>
        <button className="theme-toggle" onClick={() => setDarkMode((prev) => !prev)}>
          {darkMode ? "🌞 Light" : "🌙 Dark"}
        </button>
      </header>

      <div className="message-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === "user" ? "user" : "bot"}`}>
            {msg.content}
            <div className="time">{msg.time}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-floating">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your weather query..."
        />
       <button type="submit" onClick={handleSend}>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"

    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: "rotate(-30d" }}
  >
    <line x1="5" y1="19" x2="19" y2="5" />
    <polyline points="5 5, 19 5, 19 19" />
  </svg>
</button>



      </div>
    </div>
  );
};

export default App;
