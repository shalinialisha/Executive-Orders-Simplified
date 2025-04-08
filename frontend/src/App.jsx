import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";

// Add the global styles to the document when the component mounts
function GlobalStyles() {
  useEffect(() => {
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `;
    // Add to document head
    document.head.appendChild(styleElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return null;
}

// Loading Spinner Component with text
function LoadingSpinner() {
  return (
    <div style={{ 
      textAlign: "center", 
      marginTop: "2rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem"
    }}>
      <svg
        width="50"
        height="50"
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: "spin 1s linear infinite",
          transformOrigin: "center",
        }}
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          stroke="#3b82f6"
          strokeWidth="5"
          fill="none"
          strokeDasharray="125.6637061 125.6637061"
          strokeDashoffset="31.4159265"
        />
      </svg>
      <span style={{ 
        color: "#3b82f6", 
        fontWeight: "500", 
        marginTop: "0.5rem" 
      }}>
        Loading...
      </span>
    </div>
  );
}

// Home component (main page)
function HomePage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true); // Set loading to true when starting the fetch
    setResponse("");

    try {
      const res = await fetch("http://localhost:5001/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, apiKey }),
      });

      const data = await res.json();
      setResponse(data.response || "No response");
    } catch (error) {
      console.error(error);
      setResponse("Error fetching response");
    } finally {
      setLoading(false); // Set loading to false when done
    }
  };

  const handleScrape = async () => {
    try {
      setLoading(true); // Set loading to true when starting the scrape
      const res = await fetch("http://localhost:5001/scrape", {
        method: "POST",
      });
      const data = await res.json();
      alert(data.message || "Scrape complete!");
    } catch (error) {
      alert("Failed to run scraper.");
    } finally {
      setLoading(false); // Set loading to false when done
    }
  };

  // Function to format the response text with basic markdown-like parsing
  const formatResponse = (text) => {
    if (!text) return null;

    const boldedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    const styledText = boldedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    const withLists = styledText.replace(/(\d+\.\s+)(.*?)(\n|$)/g, '<p class="list-item"><span class="list-number">$1</span>$2</p>');
    const paragraphs = withLists.split(/\n\n+/).map((para, i) => 
      `<div class="paragraph" key=${i}>${para}</div>`
    ).join('');

    return paragraphs;
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ 
        backgroundColor: "#bfdbfe", 
        padding: "2rem", 
        borderRadius: "0.5rem", 
        width: "100%", 
        maxWidth: "64rem", 
        margin: "0 auto",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem"
      }}>
        <div style={{ 
          display: "flex", 
          gap: "1.5rem", 
          justifyContent: "center"
        }}>
          <button
            onClick={handleScrape}
            style={{ 
              backgroundColor: "#111827", 
              color: "white", 
              fontWeight: "500", 
              padding: "0.75rem 2rem", 
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer"
            }}
          >
            Scrape Actions
          </button>

          <button
            onClick={() => setShowApiKeyInput(true)}
            style={{ 
              backgroundColor: "#111827", 
              color: "white", 
              fontWeight: "500", 
              padding: "0.75rem 2rem", 
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer"
            }}
          >
            Enter Google API Key
          </button>
        </div>

        {showApiKeyInput && (
          <div style={{
            backgroundColor: "white",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            borderRadius: "0.5rem",
            padding: "1rem",
            width: "100%",
            maxWidth: "28rem",
            margin: "0 auto"
          }}>
            <label style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem"
            }}>
              Google API Key
            </label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
                marginBottom: "0.75rem"
              }}
            />
            <button
              onClick={() => setShowApiKeyInput(false)}
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.25rem",
                width: "100%",
                border: "none",
                cursor: "pointer"
              }}
            >
              Save Key
            </button>
          </div>
        )}
        
        {/* Improved formatting for LLM response */}
        {response && (
          <div style={{
            padding: "1.5rem",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            color: "#111827",
            lineHeight: "1.6",
            maxHeight: "400px",
            overflowY: "auto"
          }}
            dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
          >
          </div>
        )}

        <div style={{
          display: "flex",
          width: "100%",
          position: "relative"
        }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about executive actions..."
            style={{
              flexGrow: 1,
              padding: "1rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              backgroundColor: "#111827",
              color: "white",
              width: "100%"
            }}
          />
          <button
            onClick={handleAsk}
            disabled={loading}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              borderRadius: "9999px",
              padding: "0.5rem",
              position: "absolute",
              right: "0.5rem",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.5rem",
              height: "2.5rem"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && <LoadingSpinner />}
      </div>
    </div>
  );
}

// About component
function AboutPage() {
  return (
    <div style={{ 
      width: "100%", 
      maxWidth: "64rem", 
      margin: "0 auto", 
      color: "white", 
      padding: "2rem" 
    }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>About Presidential Actions</h2>
      <p>This tool helps citizens keep track of executive orders and presidential actions. Stay informed about changes made by the current administration through official executive orders and other presidential directives.</p>
    </div>
  );
}

// Resources component
function ResourcesPage() {
  return (
    <div style={{ 
      width: "100%", 
      maxWidth: "64rem", 
      margin: "0 auto", 
      color: "white", 
      padding: "2rem" 
    }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Related Resources</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        <li style={{ marginBottom: "1rem" }}>
          <a href="https://www.whitehouse.gov/briefing-room/presidential-actions/" style={{ color: "#3b82f6" }}>
            Official White House Presidential Actions
          </a>
        </li>
        <li style={{ marginBottom: "1rem" }}>
          <a href="https://www.federalregister.gov/presidential-documents/executive-orders" style={{ color: "#3b82f6" }}>
            Federal Register - Executive Orders
          </a>
        </li>
        <li style={{ marginBottom: "1rem" }}>
          <a href="https://www.archives.gov/federal-register/executive-orders" style={{ color: "#3b82f6" }}>
            National Archives - Executive Orders
          </a>
        </li>
      </ul>
    </div>
  );
}

// News component
function NewsPage() {
  return (
    <div style={{ 
      width: "100%", 
      maxWidth: "64rem", 
      margin: "0 auto", 
      color: "white", 
      padding: "2rem" 
    }}>
      <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Latest News</h2>
      <p>Stay updated with the latest news about presidential actions and their impacts.</p>
      
      <div style={{ marginTop: "2rem" }}>
        <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Recent Updates</h3>
        <p>No recent updates available. Check back soon for the latest news on presidential actions.</p>
      </div>
    </div>
  );
}

// Main App component
export default function App() {
  return (
    <Router>
      <GlobalStyles />
      <div style={{ 
        minHeight: "100vh", 
        backgroundColor: "#010E23", 
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        minWidth: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <div style={{ 
          width: "100%", 
          maxWidth: "64rem", 
          textAlign: "center", 
          marginBottom: "1rem"
        }}>
          <h1 style={{ 
            fontSize: "4rem", 
            fontWeight: "bold", 
            color: "#D3E3FE", 
            marginBottom: "0.5rem" 
          }}>Presidential Actions And You</h1>
          <p style={{ color: "#D3E3FE", marginBottom: "3.5rem" }}>
            Tool to help keep up and understand changes made through Executive Orders in the current administration.
          </p>
          
          {/* Horizontal Navigation */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <button style={{
                backgroundColor: "#b91c1c",
                color: "white",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer"
              }}>
                Home
              </button>
            </Link>
            
            <Link to="/about" style={{ textDecoration: "none" }}>
              <button style={{
                backgroundColor: "#b91c1c",
                color: "white",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer"
              }}>
                About
              </button>
            </Link>
            
            <Link to="/resources" style={{ textDecoration: "none" }}>
              <button style={{
                backgroundColor: "#b91c1c",
                color: "white",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer"
              }}>
                Related Resources
              </button>
            </Link>
            
            <Link to="/news" style={{ textDecoration: "none" }}>
              <button style={{
                backgroundColor: "#b91c1c",
                color: "white",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer"
              }}>
                More News
              </button>
            </Link>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}