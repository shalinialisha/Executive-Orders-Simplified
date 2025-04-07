import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = "https://www.whitehouse.gov/presidential-actions/page/1/"
        await page.goto(url)

        # Wait for the articles to be visible
        await page.wait_for_selector("article")

        # Get all article titles
        articles = await page.query_selector_all("article h2")

        print(f"Found {len(articles)} articles")
        for article in articles:
            title = await article.inner_text()
            print("✅", title)

        await browser.close()

# Run it
asyncio.run(main())
