from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Handle dialogs
    page.on("dialog", lambda dialog: dialog.accept())

    page.goto("file:///app/index.html")
    page.screenshot(path="jules-scratch/verification/initial_page.png")

    # Test settings modal
    page.click("#open-settings")
    settings_modal = page.locator("#settings")
    expect(settings_modal).to_be_visible()
    page.screenshot(path="jules-scratch/verification/settings_modal.png")
    page.click("#cancel-settings")
    expect(settings_modal).not_to_be_visible()

    # Test "Add Memory"
    page.click("#add-memory")

    # Test "Save Goals"
    page.fill("#goals-text", "Test Goals")
    page.click("#save-goals")

    # Test "Clear Canvas"
    page.click("#clear-canvas")

    # Test "Clear Console"
    page.click("#clear-console")

    # Test "New Chat"
    page.click("#new-chat")

    # Test "Clear Chat"
    page.click("#clear-chat")

    # Test sending a message
    page.fill("#user-input", "Hello")
    page.click("#send-button")
    expect(page.locator("#chat-messages")).to_contain_text("Hello")


    browser.close()

with sync_playwright() as playwright:
    run(playwright)