# Serves this folder on http://localhost:8000 and appends POSTed readings from repro.html to repro-results.jsonl
import http.server, os, json
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        with open('repro-results.jsonl', 'ab') as f: f.write(body + b'\n')
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8000), H).serve_forever()
