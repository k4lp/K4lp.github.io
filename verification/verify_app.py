
from playwright.sync_api import Page, expect, sync_playwright

def verify_android_simulation(page: Page):
    # 1. Go to the local server
    page.goto("http://localhost:8000")

    # 2. Verify Title
    expect(page).to_have_title("Android Studio Simulation")

    # 3. Interact with the Project Tree
    # Click on 'app' -> 'src' -> 'main' -> 'java' -> 'com.example.taskmanagerpro' -> 'ui' -> 'main' -> 'MainActivity.kt'
    # The folders are open by default in my script, but let's click to be sure or just target the file.
    # The file tree logic renders 'MainActivity.kt' text.

    # Locate MainActivity.kt in the tree
    file_item = page.get_by_text("MainActivity.kt")
    expect(file_item).to_be_visible()
    file_item.click()

    # 4. Verify Code Editor content
    # Check if code editor contains "class MainActivity"
    code_editor = page.locator("#code-editor")
    expect(code_editor).to_contain_text("class MainActivity")

    # 5. Verify Inspector
    # Check if Inspector shows "Main Activity" role
    inspector_role = page.locator("#inspector-panel")
    expect(inspector_role).to_contain_text("Main Activity")
    expect(inspector_role).to_contain_text("XML Layout") # Connection link

    # 6. Screenshot
    page.screenshot(path="verification/android_studio_sim.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Set viewport to a realistic desktop size
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_android_simulation(page)
            print("Verification script passed!")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
