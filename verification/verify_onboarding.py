from playwright.sync_api import sync_playwright, expect
import os

def test_onboarding_flow(page):
    print("Navigating to /auth...")
    page.goto("http://localhost:8080/auth")

    # Click Sign Up tab
    print("Clicking Sign Up tab...")
    page.get_by_role("tab", name="Sign Up").click()

    # Wait for animation/render
    page.wait_for_timeout(1000)

    # Expect Email and Password
    print("Checking for Email and Password fields...")
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password")).to_be_visible()

    # Expect Full Name and Farm Location to NOT be visible
    print("Verifying removed fields are gone...")
    # Note: "Full Name" label might exist if I didn't remove it correctly or if it's there for Sign In? No, Sign In is Email/Pass.
    # "Full Name" was only in Sign Up.

    # We check if they are visible. If they are in the DOM but hidden, to_be_visible() fails.
    # If they are not in the DOM, get_by_label might fail or return empty.

    # Using locator.count()
    if page.get_by_label("Full Name").count() > 0:
        expect(page.get_by_label("Full Name")).not_to_be_visible()

    if page.get_by_label("Farm Location").count() > 0:
        expect(page.get_by_label("Farm Location")).not_to_be_visible()

    page.screenshot(path="/home/jules/verification/auth_signup.png")
    print("Screenshot taken: auth_signup.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_onboarding_flow(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
