
from playwright.sync_api import Page, expect, sync_playwright

def verify_navigation_and_flow(page: Page):
    # 1. Go to the local server
    page.goto("http://localhost:8000")

    # 2. Navigate to LoginActivity.kt
    # Path: app/src/main/java/com.example.taskmanagerpro/ui/auth/LoginActivity.kt

    # Collapse/Expand 'app' to reset or ensure visibility.
    # We use exact=True to avoid matching "TaskApplication.kt" or description text.
    # 'app' is open by default.

    # Just click 'auth' (it's inside 'app' -> 'src' -> ... which are all open by default, except 'auth' which is closed)
    # We might need to find 'auth' inside 'ui'. 'ui' is open by default.

    # Click 'auth' to open it.
    page.get_by_text("auth", exact=True).click()

    # Click LoginActivity.kt
    login_file = page.get_by_text("LoginActivity.kt", exact=True)
    login_file.click()

    # 3. Verify Inspector Logic
    inspector = page.locator("#inspector-panel")
    expect(inspector).to_contain_text("Login Activity")

    # 4. Verify Connection Links work
    # There should be a link to AuthViewModel
    # "app/src/main/java/com.example.taskmanagerpro/ui/auth/AuthViewModel.kt"

    # Find the connection link by text "AuthViewModel"
    # The UI renders:
    # <div class="text-blue-300 ...">AuthViewModel</div>
    # <div class="text-gray-500 ...">...AuthViewModel.kt</div>

    connection_link = inspector.locator(".group").filter(has_text="AuthViewModel").first
    expect(connection_link).to_be_visible()

    # Click it
    connection_link.click()

    # 5. Verify Code Editor updated to AuthViewModel
    code_editor = page.locator("#code-editor")
    expect(code_editor).to_contain_text("class AuthViewModel")

    # 6. Verify Inspector updated to AuthViewModel
    expect(inspector).to_contain_text("Auth ViewModel")
    expect(inspector).to_contain_text("ViewModel Scope") # Execution Context

    # 7. Screenshot
    page.screenshot(path="verification/nav_fix.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_navigation_and_flow(page)
            print("Verification script passed!")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure_nav.png")
            raise e
        finally:
            browser.close()
