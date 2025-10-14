from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("file:///app/index.html")
    page.screenshot(path="jules-scratch/verification/initial_page.png")

    # Click the settings button and take a screenshot
    page.click("#open-settings")
    settings_modal = page.locator("#settings")
    expect(settings_modal).to_be_visible()
    page.screenshot(path="jules-scratch/verification/settings_modal.png")

    # Close the settings modal
    page.click("#cancel-settings")
    expect(settings_modal).not_to_be_visible()

    browser.close()

with sync_playwright() as playwright:
    run(playwright)