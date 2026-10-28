import mimetypes
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen

mimetypes.add_type('text/javascript', '.mjs')
SimpleHTTPRequestHandler.extensions_map['.mjs'] = 'text/javascript'
DROIDCAM_URL = 'http://192.168.1.43:4747/video'

class KinetHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] == '/droidcam':
            try:
                response = urlopen(Request(DROIDCAM_URL, headers={'User-Agent': 'KINET'}), timeout=10)
                self.send_response(200)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'multipart/x-mixed-replace'))
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                while True:
                    data = response.read(16384)
                    if not data:
                        break
                    self.wfile.write(data)
                    self.wfile.flush()
            except Exception as error:
                self.send_error(502, f'DroidCam no disponible: {error}')
            return
        super().do_GET()

ThreadingHTTPServer(('0.0.0.0', 8000), KinetHandler).serve_forever()
