import json
import re
from playwright.sync_api import sync_playwright

def get_email_from_page(fb_url, cookie_file_path):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Load your exported cookies
        with open(cookie_file_path, 'r') as f:
            cookies = json.load(f)

        # Fix sameSite values for Playwright compatibility
        for cookie in cookies:
            if 'sameSite' in cookie:
                if cookie['sameSite'] in ['no_restriction', 'unspecified']:
                    cookie['sameSite'] = 'None'
                elif cookie['sameSite'] == 'lax':
                    cookie['sameSite'] = 'Lax'
                elif cookie['sameSite'] == 'strict':
                    cookie['sameSite'] = 'Strict'

        context = browser.new_context()
        context.add_cookies(cookies) # This logs you in

        page = context.new_page()

        try:
            # Go to the 'about' or 'about_details' page directly
            about_url = fb_url.rstrip('/') + '/about'
            page.goto(about_url, wait_until='load', timeout=30000)

            # Get all text from the page
            body_text = page.locator('body').inner_text()

            # Use a regular expression to find an email
            # This is a basic email regex
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', body_text)

            if email_match:
                email = email_match.group(0)
                print(f"Found email: {email}")
                browser.close()
                return email
            else:
                print("Could not find email.")
                browser.close()
                return None

        except Exception as e:
            print(f"An error occurred: {e}")
            browser.close()
            return None

# --- How you would run it ---
# 1. Export your cookies to 'fb_cookies.json'
# 2. Run the function

my_cookies = 'fb_cookies.json'
# target_url = 'https://www.facebook.com/somepage'
target_url = 'https://www.facebook.com/skinplusfindon/'
found_email = get_email_from_page(target_url, my_cookies)