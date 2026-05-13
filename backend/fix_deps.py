import os
import re

for root, _, files in os.walk("app"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path) as f:
                content = f.read()
            
            # replace _: CurrentUser = Depends() with _: CurrentUser
            content = re.sub(r'(_|current_user):\s*CurrentUser\s*=\s*Depends\(\)', r'\1: CurrentUser', content)
            
            # replace CurrentUser = Depends(...) with User = Depends(...)
            content = re.sub(r':\s*CurrentUser\s*=\s*Depends\(', r': User = Depends(', content)
            
            with open(path, "w") as f:
                f.write(content)
