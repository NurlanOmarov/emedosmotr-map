from pywebpush import vapid_generate_keys
import json

def generate():
    keys = vapid_generate_keys()
    print("\n=== VAPID KEYS GENERATED ===")
    print(f"VAPID_PUBLIC_KEY={keys['public_key']}")
    print(f"VAPID_PRIVATE_KEY={keys['private_key']}")
    print("============================\n")
    print("Add these to your backend/.env file.")

if __name__ == "__main__":
    generate()
