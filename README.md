EGOKE — Login page

What I added
- `login_page.html` — responsive login page (HTML).
- `styles.css` — styles used by the HTML.
- `script.js` — small client-side validation and demo submit flow.

How to open
1. Open `c:\EGOKE` in your browser or VS Code.
2. Double-click `login_page.html` or run a local file server.

Quick local server (PowerShell):

```powershell
# from c:\EGOKE
python -m http.server 8000; Start-Process "http://localhost:8000/login_page.html"
```

Notes
- This is a frontend-only demo. Replace the simulated submit in `script.js` with a fetch POST to your backend for real auth.
- Accessible basics included: labels, aria-live for error messages, and keyboard-friendly controls.
