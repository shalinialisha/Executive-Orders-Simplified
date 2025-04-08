from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler
from bs4 import BeautifulSoup
from datetime import datetime
import requests
import os
import re

from langchain_community.tools import DuckDuckGoSearchResults
from langchain.agents import initialize_agent, AgentType
from langchain_google_genai import ChatGoogleGenerativeAI
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

# === Setup ===
app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///news_articles.db"
db = SQLAlchemy(app)

# === Models ===
class NewsArticle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Text, unique=True, nullable=False)
    content = db.Column(db.Text)
    source = db.Column(db.Text)
    date = db.Column(db.DateTime)

class NewsSource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    query_string = db.Column(db.Text)
    title = db.Column(db.Text)
    content = db.Column(db.Text)
    source = db.Column(db.Text)

with app.app_context():
    db.create_all()

# === LangChain Setup ===
search_tool = DuckDuckGoSearchResults(num_results=5)

# === Scraper for White House ===
def scrape_presidential_actions():
    print("⏰ Scraping executive orders from the White House website...")
    
    # First, clear any existing articles with generic titles that might be causing issues
    with app.app_context():
        generic_titles = ["Executive Orders", "Proclamations", "Presidential Actions", 
                          "Presidential Memoranda", "Nominations & Appointments"]
        for title in generic_titles:
            existing = NewsArticle.query.filter_by(title=title).first()
            if existing:
                print(f"🗑️ Removing generic entry: {title}")
                db.session.delete(existing)
                db.session.commit()
    
    # Set up to scrape multiple pages
    base_url = "https://www.whitehouse.gov/presidential-actions/executive-orders/"
    all_action_links = []
    
    # Scrape first page
    action_links = scrape_page(base_url)
    all_action_links.extend(action_links)
    
    # Scrape additional pages
    page = 2
    while True:
        page_url = f"https://www.whitehouse.gov/presidential-actions/executive-orders/page/{page}/"
        page_links = scrape_page(page_url)
        
        # If no links found, we've reached the end of pages
        if not page_links:
            break
            
        all_action_links.extend(page_links)
        page += 1
        # Don't scrape too many pages in development to avoid rate limiting
        if page > 5:  # Limit to first 5 pages for testing
            break
    
    all_action_links = list(set(all_action_links))  # Deduplicate
    print(f"🔍 Found {len(all_action_links)} executive order links")
    
    # Process each executive order
    for url in all_action_links:
        try:
            # Skip category pages
            if url.endswith("executive-orders/") or url.endswith("presidential-actions/"):
                continue
                
            page = requests.get(url)
            page.raise_for_status()
            article_soup = BeautifulSoup(page.text, "html.parser")
            
            # Find the title - check different possible elements
            title_elem = article_soup.find("h1", class_="page-title")
            if not title_elem:
                title_elem = article_soup.find("h1")
            
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Title"
            
            # Skip generic titles
            if title in generic_titles:
                print(f"⏭️ Skipping generic title: {title}")
                continue
                
            # Try to find content
            content_div = article_soup.find("div", class_="entry-content")
            if not content_div:
                content_div = article_soup.find("div", class_="page-content__content")
            if not content_div:
                content_div = article_soup.find("article")
                
            content = content_div.get_text(separator="\n", strip=True) if content_div else ""
            
            # Try to extract date from URL or content
            date_match = re.search(r'/presidential-actions/(\d{4})/(\d{1,2})/', url)
            if date_match:
                year, month = date_match.groups()
                day_match = re.search(r'/(\d{1,2})/', url)
                day = day_match.groups()[0] if day_match else '1'
                date_str = f"{year}-{month}-{day}"
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            else:
                # If no date in URL, try to find it in content
                date_patterns = [
                    r'(\w+ \d{1,2}, \d{4})',  # April 1, 2025
                    r'(\d{1,2}/\d{1,2}/\d{4})'  # 4/1/2025
                ]
                date_found = False
                for pattern in date_patterns:
                    date_match = re.search(pattern, content)
                    if date_match:
                        try:
                            date_str = date_match.group(1)
                            if '/' in date_str:
                                date_obj = datetime.strptime(date_str, "%m/%d/%Y")
                            else:
                                date_obj = datetime.strptime(date_str, "%B %d, %Y")
                            date_found = True
                            break
                        except ValueError:
                            pass
                
                if not date_found:
                    date_obj = datetime.utcnow()
            
            # Save to database if not already exists
            existing = NewsArticle.query.filter_by(title=title).first()
            if not existing:
                db.session.add(NewsArticle(title=title, content=content, source=url, date=date_obj))
                db.session.commit()
                print(f"✅ Saved: {title}")
                fetch_and_store_related_articles(title)
            else:
                # Update existing entry
                existing.content = content
                existing.source = url
                existing.date = date_obj
                db.session.commit()
                print(f"🔄 Updated: {title}")
                
        except Exception as e:
            print(f"❌ Error processing {url}: {e}")

def scrape_page(url):
    """Scrape a single page of executive orders and return links"""
    print(f"📄 Scraping page: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        action_links = []
        
        # Look for links in article elements (common structure)
        articles = soup.find_all("article")
        if articles:
            for article in articles:
                link_tag = article.find("a", href=True)
                if link_tag:
                    href = link_tag["href"]
                    # Only include presidential action links
                    if "/presidential-actions/" in href:
                        # Make sure it's a full URL
                        if not href.startswith("http"):
                            href = "https://www.whitehouse.gov" + href
                        action_links.append(href)
        
        # If no articles found, try finding links directly
        if not action_links:
            links = soup.find_all("a", href=True)
            for link in links:
                href = link["href"]
                # Check if it's an executive order link
                if "/presidential-actions/" in href and not href.endswith("executive-orders/"):
                    # Make sure it's a full URL
                    if not href.startswith("http"):
                        href = "https://www.whitehouse.gov" + href
                    action_links.append(href)
        
        print(f"  Found {len(action_links)} links on this page")
        return action_links
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Failed to fetch page {url}: {e}")
        return []
    
# === Search & Store External Articles ===
def fetch_and_store_related_articles(query):
    print(f"🌐 Searching for articles about: {query}")
    try:
        results = search_tool.run(query + " executive order white house")
        if isinstance(results, list):
            for r in results:
                url = r.get("link", "")
                if any(x in url for x in ["foxnews.com", "dailywire.com"]):
                    continue
                title = r.get("title", "")
                snippet = r.get("snippet", "")
                if not NewsSource.query.filter_by(source=url).first():
                    db.session.add(NewsSource(query_string=query, title=title, content=snippet, source=url))
                    db.session.commit()
    except Exception as e:
        print(f"⚠️ Error searching for related articles: {e}")

# === LLM Answer Endpoint ===
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("query")
    api_key = data.get("apiKey")  # Getting the API key from the request body

    if not question:
        return jsonify({"error": "No query provided"}), 400

    if not api_key:
        return jsonify({"error": "API key is required"}), 400

    # Log the API key to verify it's coming through correctly
    print(f"Received API Key: {api_key}")

    # Initialize the LLM dynamically with the API key provided in the request
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro-exp-03-25",
        temperature=0.2,
        api_key=api_key  # Pass the API key directly from the user input
    )

    # Running the scraper if DB is empty
    if NewsArticle.query.count() == 0:
        print("🔄 No articles found in DB, running scraper...")
        scrape_presidential_actions()

    # Respond to the request
    articles = NewsArticle.query.order_by(NewsArticle.date.desc()).limit(10).all()
    external_sources = NewsSource.query.all()

    context = "Relevant Presidential Actions:\n"
    for a in articles:
        formatted_date = a.date.strftime('%B %d, %Y') if a.date else "Unknown Date"
        context += f"\nDate: {formatted_date}\nTitle: {a.title}\nSource: {a.source}\nContent: {a.content[:500]}...\n"

    context += "\nExternal Sources:\n"
    for s in external_sources:
        context += f"\nArticle: {s.title}\nRelated to: {s.query_string}\nContent: {s.content[:300]}...\n"

    full_prompt = f"""
    You are a helpful assistant analyzing presidential executive orders. 
    
    Your task is to answer questions about executive orders issued by the Trump administration 
    in 2025. Use only the factual information provided in the context below.
    
    If asked about recent executive orders, provide specific examples with their titles,
    dates, and brief descriptions. If the information is not available in the context,
    state that clearly.

    Consider the social contexts behind each of the orders and how they relate to the current political landscape, 
    explaining the implications of each order if asked.
    
    Be specific and detailed - do not provide vague answers like "The context lists a category
    titled Executive Orders" when actual order details are available.
    
    Context:
    {context}

    Question: {question}
    """

    response = llm.invoke(full_prompt)
    print("LLM response:", response)

    if hasattr(response, "content"):
        content = response.content
    else:
        content = str(response)

    return jsonify({"response": content})


# === Manual Trigger Endpoint ===
@app.route('/scrape', methods=['POST'])
def run_scraper():
    try:
        # Completely reset the database for a fresh scrape
        with app.app_context():
            db.drop_all()
            db.create_all()
        
        scrape_presidential_actions()
        return jsonify({"message": "Scrape complete!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === Schedule Background Tasks ===
scheduler = BackgroundScheduler()
scheduler.add_job(scrape_presidential_actions, 'interval', hours=1)
scheduler.start()

# Run an initial scrape on startup if needed
#not working 
with app.app_context():
    if NewsArticle.query.count() == 0:
        scrape_presidential_actions()

# === Launch Flask ===
if __name__ == "__main__":
    app.run(debug=True, port=5001)



## 🧠 CrewAI summarization agent

# def build_panel_summary_agent():

#     return Agent(

#         role="Translingual Graphic Novel Analyst",

#         goal="Create classroom-ready summaries of visual narratives to support literacy and multilingual engagement",

#         backstory="You are an educational visual analyst who specializes in interpreting graphic novels for classroom use. Your work supports teachers working with translingual and emergent bilingual students. You describe visual panels clearly, identify themes, and avoid inserting your own interpretation beyond what’s shown.",

#         llm="gpt-4o-mini",

#         verbose=True,

#         allow_delegation=False