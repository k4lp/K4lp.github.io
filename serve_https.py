#!/usr/bin/env python3
"""
Small helper that serves `index.html` (and any adjacent assets) over HTTPS.

You will need a certificate/private-key pair in PEM format. A quick self-signed
pair can be created with OpenSSL:

    openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem \
        -out localhost-cert.pem -days 365 -subj "/CN=localhost"

Place the files next to this script (or pass their paths via --cert/--key) and
run `python serve_https.py`. The server binds to 127.0.0.1:8443 by default.
"""

from __future__ import annotations

import argparse
import http.server
import ssl
from functools import partial
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve the local index.html over HTTPS using Python's built-in server."
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Interface to bind to (default: %(default)s).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8443,
        help="Port to listen on (default: %(default)s).",
    )
    parser.add_argument(
        "--cert",
        default="localhost-cert.pem",
        help="Path to the PEM certificate file (default: %(default)s).",
    )
    parser.add_argument(
        "--key",
        default="localhost-key.pem",
        help="Path to the PEM private key file (default: %(default)s).",
    )
    return parser.parse_args()


def ensure_file(path: Path, label: str) -> Path:
    if not path.exists():
        raise FileNotFoundError(
            f"{label} not found at {path}. Generate one with OpenSSL or update --{label.lower()}."
        )
    return path


def build_handler(root: Path) -> type[http.server.SimpleHTTPRequestHandler]:
    # SimpleHTTPRequestHandler can serve the whole directory; pin it to the repo root
    return partial(http.server.SimpleHTTPRequestHandler, directory=str(root))


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parent
    cert_path = ensure_file(Path(args.cert).expanduser().resolve(), "Certificate")
    key_path = ensure_file(Path(args.key).expanduser().resolve(), "Private key")

    handler_cls = build_handler(repo_root)
    server = http.server.HTTPServer((args.host, args.port), handler_cls)

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    server.socket = context.wrap_socket(server.socket, server_side=True)

    print(
        f"Serving {repo_root / 'index.html'} at https://{args.host}:{args.port}\n"
        "Press Ctrl+C to stop."
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
