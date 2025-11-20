
from playwright.sync_api import Page, expect, sync_playwright

def verify_pro_flow(page: Page):
    # 1. Go to the local server
    page.goto("http://localhost:8000")

    # 2. Verify 'build.gradle.kts' exists (New file)
    # It is under 'app' -> 'build.gradle.kts'
    # Since 'app' is open by default, we should be able to see it or scroll to it.
    # It's a child of 'app', so it might be below 'manifests' and 'src'.
    build_gradle = page.get_by_text("build.gradle.kts")
    expect(build_gradle).to_be_visible()
    build_gradle.click()

    # 3. Verify Inspector for build.gradle.kts
    inspector = page.locator("#inspector-panel")
    expect(inspector).to_contain_text("Build Script")
    expect(inspector).to_contain_text("Triggered By") # New Field
    expect(inspector).to_contain_text("Gradle Sync")

    # 4. Navigate to 'util' package and 'Resource.kt' (New file)
    # Path: app/src/main/java/com.example.taskmanagerpro/util/Resource.kt
    # 'com.example.taskmanagerpro' is open by default.
    # 'util' is NOT open by default (isOpen: false in mock data).

    # Open 'util' folder
    page.get_by_text("util", exact=True).click()

    # Click 'Resource.kt'
    resource_file = page.get_by_text("Resource.kt")
    expect(resource_file).to_be_visible()
    resource_file.click()

    # 5. Verify Code Content
    code_editor = page.locator("#code-editor")
    expect(code_editor).to_contain_text("sealed class Resource<T>")
    expect(code_editor).to_contain_text("class Success<T>")

    # 6. Verify Inspector for Resource.kt
    expect(inspector).to_contain_text("State Wrapper")
    expect(inspector).to_contain_text("Data Stream") # Execution Context

    # 7. Screenshot
    page.screenshot(path="verification/pro_flow.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_pro_flow(page)
            print("Verification script passed!")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure_pro.png")
            raise e
        finally:
            browser.close()
