import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find async def functions and reorder arguments
    # It's easier to just change `_: CurrentUser` to `_: CurrentUser = Depends(get_current_user)`
    # Wait, the whole issue is we can't use Depends() in Annotated AND as a default value simultaneously!
    # But wait, FastAPI allows `Depends()` as a default even for Annotated, it's just that passing an empty `Depends()` might have caused a bug?
    # Actually, the error was: Cannot specify `Depends` in `Annotated` and default value together for '_'
    # Ah! So FastAPI strictly forbids `x: Annotated[T, Depends(dep)] = Depends()`.
    # But if we don't supply a default value (like `x: CurrentUser`), it works!
    # The only problem is Python's syntax: `def f(a: int = 1, x: CurrentUser)` is invalid syntax.
    # So we MUST move `x: CurrentUser` before `a: int = 1`.
    
    # Or, we can just change the type from `CurrentUser` back to `User` and explicitly use `= Depends(get_current_user)`!
    # That solves both FastAPI's assertion AND Python's syntax!
    pass

for root, _, files in os.walk("app"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()
            
            # replace _: CurrentUser, -> _: User = Depends(get_current_user),
            content = re.sub(r'_:\s*CurrentUser,', r'_: User = Depends(get_current_user),', content)
            
            # replace current_user: CurrentUser, -> current_user: User = Depends(get_current_user),
            content = re.sub(r'current_user:\s*CurrentUser,', r'current_user: User = Depends(get_current_user),', content)
            
            # replace current_user: CurrentUser) -> current_user: User = Depends(get_current_user))
            content = re.sub(r'current_user:\s*CurrentUser\)', r'current_user: User = Depends(get_current_user))', content)
            
            # replace _: CurrentUser) -> _: User = Depends(get_current_user))
            content = re.sub(r'_:\s*CurrentUser\)', r'_: User = Depends(get_current_user))', content)
            
            # also make sure get_current_user is imported if User is imported
            if 'Depends(get_current_user)' in content and 'get_current_user' not in content:
                # Add import app.middleware.auth.get_current_user
                content = content.replace('from app.middleware.auth import CurrentUser', 'from app.middleware.auth import CurrentUser, get_current_user, User')
            
            with open(path, "w") as f:
                f.write(content)
