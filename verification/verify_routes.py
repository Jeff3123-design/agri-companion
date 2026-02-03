from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test 1: Accessing Protected Route (Dashboard) redirects to Auth
        print("Navigating to /dashboard...")
        page.goto("http://localhost:8080/dashboard")

        # Wait for redirect
        page.wait_for_url("**/auth")
        print(f"Redirected to: {page.url}")

        # Verify we are on Auth page
        expect(page.get_by_role("heading", name="Farm Buddy AI")).to_be_visible()

        page.screenshot(path="verification/redirect_verification.png")
        print("Screenshot saved to verification/redirect_verification.png")

        # Test 2: Accessing Landing Page
        print("Navigating to /...")
        page.goto("http://localhost:8080/")
        expect(page.get_by_role("heading", name="Your AI-Powered Farming Companion")).to_be_visible()

        page.screenshot(path="verification/landing_verification.png")
        print("Screenshot saved to verification/landing_verification.png")

        browser.close()

if __name__ == "__main__":
    run()
