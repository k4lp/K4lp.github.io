#!/usr/bin/env python3
"""
secure_static_server.py
-----------------------
A robust local web server for delivering static HTML/CSS/JS over HTTPS on localhost,
with automatic self-signed certificate generation if none exists. Includes permissive
CORS by default (configurable), optional SPA fallback, HTTP->HTTPS redirect helper,
and sensible MIME mappings for modern assets (e.g., .mjs, .wasm).

Usage (most common):
    python secure_static_server.py --root .

Helpful flags:
    --port 8443                  HTTPS port (default 8443)
    --http-port 8000            HTTP port for optional redirect (default 8000)
    --no-http-redirect          Serve only HTTPS; don't start HTTP redirector
    --host 127.0.0.1            Bind host (default 127.0.0.1)
    --root /path/to/site        Directory to serve (default CWD)
    --allow-origin *            CORS allowed origin(s); "*" or comma-separated list
    --allow-credentials         Send Access-Control-Allow-Credentials: true
    --spa                       Enable SPA fallback to /index.html for unknown routes
    --coep                      Add Cross-Origin-Embedder-Policy: require-corp
    --coop                      Add Cross-Origin-Opener-Policy: same-origin
    --corp                      Add Cross-Origin-Resource-Policy: same-origin
    --generate-only             Create/refresh the self-signed certificate and exit
    --cert-dir ~/.local/share/secure_static_server/certs  Directory for cert/key
    --cert-name localhost       Base name for cert/key files (cert.pem/key.pem)
    --days 825                  Validity of self-signed certificate

Notes:
- If 'cryptography' is available, it is used to generate the self-signed certificate.
- Otherwise, we attempt to shell out to 'openssl' if present.
- If neither is available, HTTPS cannot be started; meaningful guidance is printed.
- Self-signed certs will still show a browser warning unless you explicitly trust it.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime as _dt
import ipaddress
import logging
import mimetypes
import os
import socket
import ssl
import sys
import tempfile
import threading
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from subprocess import CalledProcessError, run

LOG = logging.getLogger("secure_static_server")

# ---------- Utility ----------

def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)

def is_tool(name: str) -> bool:
    """Check whether `name` is on PATH and executable."""
    from shutil import which
    return which(name) is not None

def set_private_perms(path: Path) -> None:
    """Set 0600 perms on files if possible (POSIX)."""
    with contextlib.suppress(Exception):
        path.chmod(0o600)

# ---------- Certificate generation ----------

def generate_self_signed_with_cryptography(cert_path: Path, key_path: Path, days: int) -> bool:
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
    except Exception as e:
        LOG.debug("cryptography not usable: %s", e)
        return False

    LOG.info("Generating self-signed certificate with 'cryptography'...")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, u"localhost")])
    now = _dt.datetime.utcnow()
    builder = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - _dt.timedelta(days=1))
        .not_valid_after(now + _dt.timedelta(days=days))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.IPAddress(ipaddress.IPv6Address("::1")),
            ]),
            critical=False,
        )
        .add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),
            critical=False
        )
        .add_extension(
            x509.KeyUsage(digital_signature=True, key_encipherment=True,
                          content_commitment=False, data_encipherment=False,
                          key_agreement=False, key_cert_sign=False, crl_sign=False,
                          encipher_only=False, decipher_only=False),
            critical=True
        )
    )
    cert = builder.sign(private_key=key, algorithm=hashes.SHA256())
    # Write key
    key_bytes = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    )
    cert_bytes = cert.public_bytes(serialization.Encoding.PEM)
    key_path.write_bytes(key_bytes)
    cert_path.write_bytes(cert_bytes)
    set_private_perms(key_path)
    set_private_perms(cert_path)
    LOG.info("Wrote key: %s", key_path)
    LOG.info("Wrote cert: %s", cert_path)
    return True

def generate_self_signed_with_openssl(cert_path: Path, key_path: Path, days: int) -> bool:
    if not is_tool("openssl"):
        return False
    LOG.info("Generating self-signed certificate with 'openssl' CLI...")
    # Create a temp config to specify SANs
    cfg = f"""
[req]
default_bits       = 2048
distinguished_name = req_distinguished_name
x509_extensions    = v3_req
prompt             = no

[req_distinguished_name]
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1  = 127.0.0.1
IP.2  = ::1
""".strip()

    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".cnf") as f:
        f.write(cfg)
        cfg_path = Path(f.name)

    try:
        run([
            "openssl", "req", "-x509", "-nodes", "-newkey", "rsa:2048",
            "-keyout", str(key_path), "-out", str(cert_path),
            "-days", str(days),
            "-config", str(cfg_path),
        ], check=True, capture_output=True)
        set_private_perms(key_path)
        set_private_perms(cert_path)
        LOG.info("Wrote key: %s", key_path)
        LOG.info("Wrote cert: %s", cert_path)
        return True
    except CalledProcessError as e:
        LOG.error("OpenSSL failed: %s", e.stderr.decode(errors='ignore'))
        return False
    finally:
        with contextlib.suppress(Exception):
            cfg_path.unlink()

def ensure_certificate(cert_dir: Path, cert_name: str, days: int) -> tuple[Path, Path]:
    ensure_dir(cert_dir)
    cert_path = cert_dir / f"{cert_name}.cert.pem"
    key_path = cert_dir / f"{cert_name}.key.pem"
    if cert_path.exists() and key_path.exists():
        return cert_path, key_path

    if generate_self_signed_with_cryptography(cert_path, key_path, days):
        return cert_path, key_path

    if generate_self_signed_with_openssl(cert_path, key_path, days):
        return cert_path, key_path

    raise RuntimeError(
        "Unable to generate self-signed certificate. Please install either:\n"
        "  - Python package 'cryptography' (pip install cryptography)\n"
        "  - or OpenSSL CLI (https://www.openssl.org/)\n"
    )

# ---------- HTTP Handlers ----------

def _augment_mime_types():
    # Enrich mime types for modern assets
    mimetypes.add_type("application/javascript", ".mjs")
    mimetypes.add_type("application/wasm", ".wasm")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("application/json", ".json")
    mimetypes.add_type("image/avif", ".avif")
    mimetypes.add_type("image/webp", ".webp")

_augment_mime_types()

class CORSRequestHandler(SimpleHTTPRequestHandler):
    # Extra server config will be attached to the HTTPServer instance
    # as attributes by the bootstrap code below.

    def log_message(self, fmt, *args):
        LOG.info("%s - %s", self.address_string(), fmt % args)

    def _send_cors_headers(self):
        allow = getattr(self.server, "cors_allow_origin", "*")
        allow_credentials = getattr(self.server, "cors_allow_credentials", False)
        origin = self.headers.get("Origin")

        if allow == "*":
            self.send_header("Access-Control-Allow-Origin", "*")
        else:
            allowed = [o.strip() for o in allow.split(",") if o.strip()]
            if origin and origin in allowed:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
        req_headers = self.headers.get("Access-Control-Request-Headers")
        self.send_header("Access-Control-Allow-Headers", req_headers or "*")
        if allow_credentials:
            self.send_header("Access-Control-Allow-Credentials", "true")

    def _send_security_headers(self):
        if getattr(self.server, "set_coep", False):
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        if getattr(self.server, "set_coop", False):
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        if getattr(self.server, "set_corp", False):
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        # Basic hardening:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer-when-downgrade")

    def end_headers(self):
        self._send_cors_headers()
        self._send_security_headers()
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        # SPA fallback if enabled
        spa = getattr(self.server, "spa_fallback", False)
        if spa:
            path = self.translate_path(self.path)
            if not os.path.exists(path) and not self.path.startswith("/.well-known/"):
                self.path = "/index.html"
        return super().do_GET()

# ---------- Redirect HTTP Handler ----------

class RedirectToHTTPS(SimpleHTTPRequestHandler):
    def do_GET(self):
        host = self.headers.get("Host", "")
        # Replace port with HTTPS port
        https_port = getattr(self.server, "https_port", 8443)
        if ":" in host:
            host = host.split(":")[0]
        location = f"https://{host}:{https_port}{self.path}"
        self.send_response(HTTPStatus.TEMPORARY_REDIRECT)
        self.send_header("Location", location)
        self.end_headers()

    def log_message(self, fmt, *args):
        LOG.info("HTTP->HTTPS redirect: " + (fmt % args))

# ---------- Server bootstrap ----------

def create_https_server(host: str, port: int, directory: Path, cert_path: Path, key_path: Path,
                        allow_origin: str, allow_credentials: bool,
                        spa: bool, coep: bool, coop: bool, corp: bool) -> ThreadingHTTPServer:
    handler = lambda *args, **kwargs: CORSRequestHandler(*args, directory=str(directory), **kwargs)
    httpd = ThreadingHTTPServer((host, port), handler)

    # Attach settings for handler
    httpd.cors_allow_origin = allow_origin
    httpd.cors_allow_credentials = allow_credentials
    httpd.spa_fallback = spa
    httpd.set_coep = coep
    httpd.set_coop = coop
    httpd.set_corp = corp

    # Wrap with SSL
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    # Reasonable TLS options for local dev
    ctx.options |= ssl.OP_NO_SSLv2 | ssl.OP_NO_SSLv3
    ctx.set_ciphers("ECDHE+AESGCM:ECDHE+CHACHA20:@STRENGTH")
    with contextlib.suppress(Exception):
        ctx.set_alpn_protocols(["http/1.1"])
    ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    return httpd

def create_http_redirect_server(host: str, http_port: int, https_port: int, directory: Path) -> ThreadingHTTPServer:
    handler = lambda *args, **kwargs: RedirectToHTTPS(*args, directory=str(directory), **kwargs)
    httpd = ThreadingHTTPServer((host, http_port), handler)
    httpd.https_port = https_port
    return httpd

def main(argv=None):
    parser = argparse.ArgumentParser(description="Robust local HTTPS static server with auto-cert and CORS.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8443, help="HTTPS port (default: 8443)")
    parser.add_argument("--http-port", type=int, default=8000, help="HTTP port for redirect (default: 8000)")
    parser.add_argument("--no-http-redirect", action="store_true", help="Don't start HTTP redirector")
    parser.add_argument("--root", default=".", help="Directory to serve (default: current directory)")
    parser.add_argument("--allow-origin", default="*", help='CORS: allowed origin(s), "*" or comma-separated list')
    parser.add_argument("--allow-credentials", action="store_true", help="CORS: send Allow-Credentials: true")
    parser.add_argument("--spa", action="store_true", help="Enable SPA fallback to /index.html")
    parser.add_argument("--coep", action="store_true", help="Set COEP: require-corp")
    parser.add_argument("--coop", action="store_true", help="Set COOP: same-origin")
    parser.add_argument("--corp", action="store_true", help="Set CORP: same-origin")
    parser.add_argument("--generate-only", action="store_true", help="Generate cert and exit")
    parser.add_argument("--cert-dir", default=str(Path.home() / ".local" / "share" / "secure_static_server" / "certs"),
                        help="Directory to store cert/key (default: ~/.local/share/secure_static_server/certs)")
    parser.add_argument("--cert-name", default="localhost", help="Base name for cert/key files (default: localhost)")
    parser.add_argument("--days", type=int, default=825, help="Self-signed cert validity in days (default: 825)")
    parser.add_argument("-v", "--verbose", action="count", default=0, help="Increase verbosity (-v, -vv)")

    args = parser.parse_args(argv)

    # Logging
    level = logging.WARNING
    if args.verbose == 1:
        level = logging.INFO
    elif args.verbose >= 2:
        level = logging.DEBUG
    logging.basicConfig(stream=sys.stdout, level=level, format="%(asctime)s | %(levelname)s | %(message)s")

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"[ERROR] Root directory does not exist: {root}", file=sys.stderr)
        sys.exit(2)

    cert_dir = Path(os.path.expanduser(args.cert_dir)).resolve()
    try:
        cert_path, key_path = ensure_certificate(cert_dir, args.cert_name, args.days)
    except Exception as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(3)

    if args.generate_only:
        print(f"[OK] Certificate ready:\n  cert: {cert_path}\n  key:  {key_path}")
        sys.exit(0)

    # HTTPS server
    try:
        https_srv = create_https_server(
            host=args.host, port=args.port, directory=root,
            cert_path=cert_path, key_path=key_path,
            allow_origin=args.allow_origin, allow_credentials=args.allow_credentials,
            spa=args.spa, coep=args.coep, coop=args.coop, corp=args.corp,
        )
    except OSError as e:
        print(f"[ERROR] Failed to bind HTTPS {args.host}:{args.port} — {e}", file=sys.stderr)
        sys.exit(4)

    # Optional HTTP redirect
    http_srv = None
    if not args.no_http_redirect:
        try:
            http_srv = create_http_redirect_server(args.host, args.http_port, args.port, root)
        except OSError as e:
            LOG.warning("HTTP redirector not started (bind failed): %s", e)

    print("──────────────────────────────────────────────────────────────")
    print(" Secure Local Static Server")
    print("──────────────────────────────────────────────────────────────")
    print(f" Root:          {root}")
    print(f" HTTPS:         https://{args.host}:{args.port}")
    if http_srv:
        print(f" HTTP (redir):  http://{args.host}:{http_srv.server_port}  → HTTPS:{args.port}")
    print(f" CORS Origins:  {args.allow_origin!r}")
    print(f" Credentials:   {'enabled' if args.allow_credentials else 'disabled'}")
    print(f" SPA Fallback:  {'enabled' if args.spa else 'disabled'}")
    print(f" COEP/COOP/CORP:{'Y' if args.coep else 'N'}/{'Y' if args.coop else 'N'}/{'Y' if args.corp else 'N'}")
    print("──────────────────────────────────────────────────────────────")
    print(" Tip: First time, your browser will warn about a self-signed cert.")
    print("      You can add an exception or import the cert to your trust store.")
    print("──────────────────────────────────────────────────────────────")

    # Serve
    def serve(server, label):
        try:
            server.serve_forever(poll_interval=0.5)
        except KeyboardInterrupt:
            pass
        finally:
            with contextlib.suppress(Exception):
                server.server_close()
        LOG.info("%s server stopped", label)

    threads = []
    t_https = threading.Thread(target=serve, args=(https_srv, "HTTPS"), daemon=True)
    t_https.start()
    threads.append(t_https)

    if http_srv:
        t_http = threading.Thread(target=serve, args=(http_srv, "HTTP redirect"), daemon=True)
        t_http.start()
        threads.append(t_http)

    try:
        for t in threads:
            t.join()
    except KeyboardInterrupt:
        print("\nShutting down...")

if __name__ == "__main__":
    main()
