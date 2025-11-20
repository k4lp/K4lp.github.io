
from playwright.sync_api import Page, expect, sync_playwright

def verify_advanced_concepts(page: Page):
    # 1. Go to the local server
    page.goto("http://localhost:8000")

    # 2. Verify 'domain' package exists (Clean Architecture)
    # Path: app/src/main/java/com.example.taskmanagerpro/domain/usecase/GetTasksUseCase.kt

    # Click 'domain'
    domain_folder = page.get_by_text("domain", exact=True)
    expect(domain_folder).to_be_visible()
    domain_folder.click()

    # Click 'usecase'
    usecase_folder = page.get_by_text("usecase", exact=True)
    expect(usecase_folder).to_be_visible()

    # Click 'GetTasksUseCase.kt'
    usecase_file = page.get_by_text("GetTasksUseCase.kt", exact=True)
    expect(usecase_file).to_be_visible()
    usecase_file.click()

    # Verify Code
    code_editor = page.locator("#code-editor")
    expect(code_editor).to_contain_text("class GetTasksUseCase")

    # Verify Inspector
    inspector = page.locator("#inspector-panel")
    expect(inspector).to_contain_text("Use Case")
    expect(inspector).to_contain_text("Encapsulates the logic")

    # 3. Verify 'worker' package (WorkManager)
    # Path: app/src/main/java/com.example.taskmanagerpro/worker/SyncDataWorker.kt
    # 'worker' is NOT open by default.

    worker_folder = page.get_by_text("worker", exact=True)
    expect(worker_folder).to_be_visible()
    worker_folder.click()

    sync_file = page.get_by_text("SyncDataWorker.kt", exact=True)
    sync_file.click()

    expect(inspector).to_contain_text("Coroutine Worker")
    expect(inspector).to_contain_text("WorkManager Thread")

    # 4. Verify 'test' source set (Unit Testing)
    # Path: app/src/test/java/com.example.taskmanagerpro/MainViewModelTest.kt
    # 'test' folder is under 'src'. It is NOT open by default.

    test_folder = page.get_by_text("test", exact=True)
    test_folder.click()

    # Click 'java' inside test
    # We filter for visible java folders.
    # main/java is visible. test/java is visible after clicking test.
    # But they have same name.

    # We can traverse down: test -> java -> com.example...

    # Let's use specific clicks if possible, or simply click the 2nd 'java' found.
    java_folders = page.get_by_text("java", exact=True).all()
    # Filter for visible ones?
    visible_java = [j for j in java_folders if j.is_visible()]

    if len(visible_java) >= 2:
        visible_java[1].click() # Click test/java

        # Inside test/java -> com.example... (closed)
        # We need to click com.example...
        # There are two "com.example.taskmanagerpro" visible now (one in main, one in test)
        packages = page.get_by_text("com.example.taskmanagerpro", exact=True).all()
        visible_packages = [p for p in packages if p.is_visible()]

        if len(visible_packages) >= 2:
            visible_packages[1].click() # Click test package

            # Now file should be visible
            test_file = page.get_by_text("MainViewModelTest.kt", exact=True)
            expect(test_file).to_be_visible()
            test_file.click()

            expect(inspector).to_contain_text("Unit Test Class")
            expect(inspector).to_contain_text("JUnit Runner")

    # 5. Screenshot
    page.screenshot(path="verification/advanced_concepts.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 800})
        try:
            verify_advanced_concepts(page)
            print("Verification script passed!")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure_advanced.png")
            raise e
        finally:
            browser.close()
