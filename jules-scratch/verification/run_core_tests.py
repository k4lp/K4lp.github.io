import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath('test.html')
        await page.goto(f'file://{file_path}')
        await page.wait_for_load_state('networkidle')

        await page.screenshot(path='jules-scratch/verification/core_test_results.png')

        await browser.close()
        print("Core test runner executed successfully.")

if __name__ == '__main__':
    asyncio.run(main())