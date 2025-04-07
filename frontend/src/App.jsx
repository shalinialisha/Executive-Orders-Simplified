import React, { useState } from "react";

export default function App() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("http://localhost:5001/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, apiKey }),  // Send the API key in the request body
      });

      const data = await res.json();
      setResponse(data.response || "No response");
    } catch (error) {
      console.error(error);  // Log the error for debugging
      setResponse("Error fetching response");
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    try {
      const res = await fetch("http://localhost:5001/scrape", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Scrape complete!");
    } catch (error) {
      alert("Failed to run scraper.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-start">
      <div className="w-full max-w-3xl text-center mb-10">
        <h1 className="text-5xl font-bold text-gray-900 mb-2">Executive Orders Simplified</h1>
        <p className="text-gray-600">
          Track and understand Executive Orders and Actions from the current administration. Answer your questions about them 
          and get the latest updates.
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleScrape}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg shadow"
        >
          Scrape Presidential Actions
        </button>

        <button
          onClick={() => setShowApiKeyInput(true)}
          className="bg-gray-800 hover:bg-gray-900 text-white font-semibold px-5 py-2 rounded-lg shadow"
        >
          Enter Google API Key
        </button>
      </div>

      {showApiKeyInput && (
        <div className="bg-white shadow-lg rounded-lg p-4 w-full max-w-md mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Google API Key
          </label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key..."
            className="w-full p-2 border border-gray-300 rounded mb-3"
          />
          <button
            onClick={() => setShowApiKeyInput(false)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full"
          >
            Save Key
          </button>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-2xl">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about executive actions..."
            className="flex-grow p-3 border border-gray-300 rounded-lg"
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
          >
            {loading ? "Loading..." : "Ask"}
          </button>
        </div>
      </div>

      {response && (
        <div className="mt-6 p-6 bg-white shadow-lg rounded-lg w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Response:</h3>
          <p className="text-gray-700 whitespace-pre-line">{response}</p>
        </div>
      )}
    </div>
  );
}
