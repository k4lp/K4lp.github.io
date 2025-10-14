import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')
        await page.wait_for_load_state('networkidle')

        # 1. Open settings and save an API key
        await page.click("#open-settings")
        await page.wait_for_timeout(500) # Give the dialog time to open
        dialog = page.locator("#settings")
        await expect(dialog).to_be_visible()
        # The user said they added keys, but for a clean test, I'll add one.
        # In a real scenario, I'd ask the user to confirm the key is set.
        # For this test, I will use a placeholder. The user can replace it.
        await page.fill("#key-1", "YOUR_GEMINI_API_KEY_HERE")
        await page.click("#save-settings")
        await expect(dialog).not_to_be_visible()

        # 2. Send a simple message
        await page.fill("#prompt", "Hello, world!")
        await page.click("#send")

        # Wait for a response from the model. This might take a while.
        # We'll wait for the assistant's message bubble to appear and have some text.
        await expect(page.locator(".msg.assistant .bubble")).to_contain_text("Hello", timeout=30000)

        # 3. Use the JS Runner
        js_code = "return 2 + 2;"
        await page.fill("#js-code", js_code)
        await page.click("#run-js")
        await expect(page.locator("#js-output")).to_contain_text("4")

        # 4. Use the Canvas to render HTML
        html_code = "<h1>Canvas Test</h1><p>This is rendered in the canvas.</p>"
        # We need to use a tool call for this
        canvas_prompt = f"""Use the canvas.render tool to display the following HTML:
        ```html
        {html_code}
        ```"""
        await page.fill("#prompt", canvas_prompt)
        await page.click("#send")

        # We need a way to verify the canvas was updated.
        # For now, we'll just check if the tool was called in the trace.
        await expect(page.locator("#tools-log")).to_contain_text("→ canvas.render", timeout=30000)

        # 5. Take a final screenshot
        await page.screenshot(path='jules-scratch/verification/full_test_result.png')

        await browser.close()
        print("Full test script executed successfully.")

if __name__ == '__main__':
    asyncio.run(main())