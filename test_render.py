import urllib.request

urls_to_try = [
    'https://catechcare.onrender.com/api/vitals/',
    'https://catechcare-api.onrender.com/api/vitals/',
    'https://catechcare-backend.onrender.com/api/vitals/'
]

for url in urls_to_try:
    try:
        print(f"Trying {url}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        print(f"Success! Response code: {response.getcode()}")
    except urllib.error.HTTPError as e:
        print(f"Error {e.code} for {url} - This is good if it's 401 or 403 (means backend is there)")
    except urllib.error.URLError as e:
        print(f"Failed to reach {url}: {e.reason}")
    except Exception as e:
        print(f"Unexpected error for {url}: {e}")
