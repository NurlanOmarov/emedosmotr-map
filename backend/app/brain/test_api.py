import requests


def check_api():
    try:
        # The API is exposed on localhost:8000
        url = "http://localhost:8000/api/geo/regions?include_geometry=true"
        print(f"Calling {url}...")
        resp = requests.get(url, timeout=5)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Received {len(data)} regions")
            if len(data) > 0:
                print(f"First region: {data[0].get('name')}")
                geom = data[0].get('geometry_json')
                print(f"Geometry present: {geom is not None}")
        else:
            print(f"Error response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_api()
