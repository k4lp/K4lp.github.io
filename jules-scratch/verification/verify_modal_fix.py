import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')
        await page.wait_for_load_state('networkidle')

        # Test 1: Verify settings modal functionality
        await page.click("#open-settings")
        await page.wait_for_timeout(500) # Give the browser time to process the event

        display_style = await page.evaluate("document.getElementById('settings').style.display")
        print(f"Settings modal display style: {display_style}")
        assert display_style == 'flex', "Settings modal did not open"
        print("Settings modal open test passed.")

        await page.click("#cancel-settings")
        await page.wait_for_timeout(500)

        display_style_closed = await page.evaluate("document.getElementById('settings').style.display")
        print(f"Settings modal display style after close: {display_style_closed}")
        assert display_style_closed == 'none', "Settings modal did not close"
        print("Settings modal close test passed.")

        await browser.close()
        print("Direct DOM manipulation test script executed successfully.")

if __name__ == '__main__':
    asyncio.run(main())