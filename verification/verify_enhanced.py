
from playwright.sync_api import Page, expect, sync_playwright

def verify_inspector_enhancements(page: Page):
    # 1. Go to the local server
    page.goto("http://localhost:8000")

    # 2. Verify Inspector shows Root info by default
    inspector = page.locator("#inspector-panel")
    expect(inspector).to_contain_text("Project Root")
    expect(inspector).to_contain_text("Standard Android project structure")

    # 3. Click on 'app' folder to inspect it.
    # 'app' is open by default. Clicking it will close it.
    # We want to inspect it, so we click.
    app_folder = page.get_by_text("app", exact=True)
    app_folder.click()

    # 4. Verify Inspector updates for 'app' folder
    expect(inspector).to_contain_text("App Module")
    expect(inspector).to_contain_text("Separation of concerns")

    # 5. Navigate to RegisterActivity.kt
    # Since we clicked 'app' and it was open, it is now CLOSED.
    # We must click it again to OPEN it.
    app_folder.click()

    # Now 'src' should be visible.
    # 'src' is open by default.
    # 'main' is open by default.
    # 'java' is open by default.
    # 'com.example.taskmanagerpro' is open by default.
    # 'ui' is open by default.

    # 'auth' is NOT open by default in the mock data (isOpen: false).
    # So we need to find 'ui' and ensure we can see 'auth'.
    # Note: In the script.js I wrote:
    # "ui": { ... isOpen: true, ... children: { "auth": { ... isOpen: false ...

    # So 'auth' text should be visible.
    page.get_by_text("auth", exact=True).click()

    # Now 'RegisterActivity.kt' should be visible.
    register_file = page.get_by_text("RegisterActivity.kt")
    expect(register_file).to_be_visible()
    register_file.click()

    # 6. Verify Inspector for RegisterActivity
    expect(inspector).to_contain_text("Register Activity")
    expect(inspector).to_contain_text("User acquisition")
    expect(inspector).to_contain_text("Flow")
    expect(inspector).to_contain_text("Dependencies & Connections")

    # 7. Screenshot
    page.screenshot(path="verification/inspector_enhanced.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_inspector_enhancements(page)
            print("Verification script passed!")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure_enhanced.png")
            raise e
        finally:
            browser.close()
