import os
from flask import Flask, request, jsonify
from oldfun import get_email_from_page # Your script

app = Flask(__name__)

@app.route('/scrape', methods=['POST'])
def scrape():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({"error": "URL is required"}), 400

    fb_url = data['url']
    print(fb_url)

    # IMPORTANT: You must pass your cookies in the request
    # or load them from a secure location.
    # cookies = data.get('cookies') 
    
    # if not cookies:
    #     return jsonify({"error": "Cookies are required"}), 400

    # You'll need to adapt your script to accept the cookies as a string/dict





    my_cookies = 'fb_cookies.json'
    # target_url = 'https://www.facebook.com/somepage'
    # target_url = 'https://www.facebook.com/skinplusfindon/'
    email = get_email_from_page(fb_url, my_cookies)

    # email = get_email_from_page(fb_url, cookies) 




    if email:
        return jsonify({"email": email})
    else:
        return jsonify({"email": None, "error": "Not found"}), 404

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))