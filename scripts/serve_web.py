"""Local preview with SQLite WASM headers and SPA route fallback."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
from urllib.parse import unquote, urlsplit
os.chdir(Path(__file__).resolve().parents[1] / 'dist-web')
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()
    def do_GET(self):
        if not Path(unquote(urlsplit(self.path).path).lstrip('/') or 'index.html').exists():
            self.path = '/index.html'
        super().do_GET()
print('EventGear: http://localhost:8765', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
