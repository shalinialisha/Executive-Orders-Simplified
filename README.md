# Executive Orders Simplified (EOS)
## Tool to help track and understand changes made through Executive Orders during this administration

This application continuously monitors the White House website for new presidential actions and provides an interactive chatbot interface to help users understand these executive orders.

## Features

- **Automated Monitoring**: Scans the White House presidential actions page hourly for new publications
- **Smart Data Collection**: Parses and stores detailed information about each executive order
- **Interactive Chat Interface**: Ask questions about any presidential action and receive AI-powered explanations
- **Historical Tracking**: Maintains a complete archive of all presidential actions from the current administration

## Features that will soon be added
- Removing the "Scrape Presidential Actions" button 
- Adding feature that will tell user when website is actively scraping (and the last time it scraped)
- Defining logic for how the website can search the internet (with DuckDuckGo) to find articles that talk about the Executive Orders, allowing for more prospectives on them
- Fixing the UI so that it is more user friendly
- Adding an "About" page for users to reference

## How It Works

### Data Collection System

The application automatically checks for new presidential actions every hour by:

1. Polling `https://www.whitehouse.gov/presidential-actions/`
2. Using URL pattern recognition to identify new content:
   - Format: `https://www.whitehouse.gov/presidential-actions/{year}/{month}/{action-name}`
   - System dynamically checks the current year/month directories for new entries
3. Scraping the full text and metadata of each action
4. Storing all information in a SQL database for quick retrieval

### Database Structure

The SQL database stores:
- Action ID
- Title
- Publication date
- Full text content
- Action type (Executive Order, Proclamation, Memorandum, etc.)
- URL reference

### Chat Interface

The application features a user-friendly chat interface with plenty of uses. For example:
- Enter prompts about specific executive orders
- Ask for explanations of complex policy language
- Request summaries of recent actions
- Ask about potential impacts

## Images 
Comparing EOS and ChatGPT when asked "What's the latest Executive Order?"

-EOS gave accurate, current information
-ChatGPT gave outdated knowledge

### EOS 
<img width="1552" alt="Screenshot 2025-04-07 at 8 33 09 PM" src="https://github.com/user-attachments/assets/27bac96a-6f93-48bd-89ba-e1fdada0b10c" />

### ChatGPT
<img width="1351" alt="Screenshot 2025-04-07 at 1 14 06 AM" src="https://github.com/user-attachments/assets/1e3a52be-9864-44b3-b334-93b5739c0850" />


