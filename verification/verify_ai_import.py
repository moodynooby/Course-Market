from playwright.sync_api import sync_playwright, expect

def test_ai_import_ui(page):
    # Navigate to the app
    page.goto("http://localhost:3000")

    # Bypass login by setting localStorage
    page.evaluate("window.localStorage.setItem('app-user', JSON.stringify({uid: 'test-user', displayName: 'Test User', provider: 'google'}));")
    page.reload()

    # Wait for the Import page to load
    expect(page.get_by_text("Import Courses")).to_be_visible()

    # Verify the AI Helper section is present
    expect(page.get_by_text("Natural Language AI Helper")).to_be_visible()

    # Enter some instructions
    instruction_box = page.get_by_placeholder("Enter instructions for the AI...")
    instruction_box.fill("The first column is the Course Code")

    # Click 'Learn as Mapping Rule'
    page.get_by_role("button", name="Learn as Mapping Rule").click()

    # Verify the rule chip appears
    expect(page.get_by_text("The first column is the Course Code")).to_be_visible()

    # Take a screenshot
    page.screenshot(path="verification/ai_import_verified.png", full_page=True)
    print("Verification screenshot saved to verification/ai_import_verified.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            test_ai_import_ui(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
