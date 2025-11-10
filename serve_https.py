#!/usr/bin/env python3
"""Serve the static site over HTTPS with a verifiable certificate.

Point the script at certificate/key files that chain up to a trusted CA
(for example ones created via `mkcert`, your enterprise CA, or LetsEncrypt)
so browsers can verify the connection when you open https://localhost:PORT.
"""

from __future__ import annotations

import argparse
import http.server
import json
import pathlib
import platform
import ssl
import subprocess
import textwrap
from functools import partial


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve the current workspace over HTTPS using a trusted certificate."
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Interface/IP to bind to (default: %(default)s).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8443,
        help="Port to listen on (default: %(default)s).",
    )
    parser.add_argument(
        "--cert",
        default="certificates/dev-cert.pem",
        help="Path to a PEM certificate that chains to a trusted CA.",
    )
    parser.add_argument(
        "--key",
        default="certificates/dev-key.pem",
        help="Private key that matches --cert.",
    )
    parser.add_argument(
        "--directory",
        default=".",
        help="Directory to serve (default: project root).",
    )
    parser.add_argument(
        "--dns",
        nargs="*",
        help=(
            "Extra DNS names/IPs to include in the auto-generated certificate. "
            "Defaults to localhost plus the host argument."
        ),
    )
    return parser.parse_args()


def build_ssl_context(cert_path: pathlib.Path, key_path: pathlib.Path) -> ssl.SSLContext:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.options |= ssl.OP_NO_COMPRESSION
    ctx.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))
    return ctx


def ensure_certificate_files(
    cert_path: pathlib.Path, key_path: pathlib.Path, hostnames: list[str]
) -> None:
    """Create and trust a localhost certificate when missing (Windows only)."""
    cert_path.parent.mkdir(parents=True, exist_ok=True)
    key_path.parent.mkdir(parents=True, exist_ok=True)
    if cert_path.exists() and key_path.exists():
        return

    if platform.system() != "Windows":
        raise RuntimeError(
            "Certificate files are missing and automatic provisioning "
            "is only available on Windows. Provide --cert/--key manually."
        )

    deduped = list(dict.fromkeys(hostnames))
    dns_values = ", ".join(f"'{name}'" for name in deduped)
    friendly_name = "K4lp Dev HTTPS"
    ps_script = textwrap.dedent(
        f"""
        $ErrorActionPreference = 'Stop'
        $dnsNames = @({dns_values})
        $friendlyName = '{friendly_name}'
        $certPath = 'Cert:\\CurrentUser\\My'
        $rootStore = 'Cert:\\CurrentUser\\Root'

        $cert = Get-ChildItem $certPath | Where-Object {{
            $_.FriendlyName -eq $friendlyName
        }} | Select-Object -First 1

        if (-not $cert) {{
            $cert = New-SelfSignedCertificate `
                -DnsName $dnsNames `
                -CertStoreLocation $certPath `
                -FriendlyName $friendlyName `
                -KeyExportPolicy Exportable `
                -HashAlgorithm SHA256 `
                -KeyLength 2048 `
                -NotAfter (Get-Date).AddYears(2)
        }}

        $hasRoot = Get-ChildItem $rootStore | Where-Object {{ $_.Thumbprint -eq $cert.Thumbprint }} | Select-Object -First 1
        if (-not $hasRoot) {{
            $tmp = [System.IO.Path]::GetTempFileName()
            Export-Certificate -Cert $cert -FilePath $tmp | Out-Null
            Import-Certificate -FilePath $tmp -CertStoreLocation $rootStore | Out-Null
            Remove-Item $tmp -Force
        }}

        function Write-AsnLength {{
            param([System.IO.BinaryWriter]$Writer, [int]$Length)
            if ($Length -lt 0x80) {{
                $Writer.Write([byte]$Length)
            }} else {{
                $bytes = @()
                $value = $Length
                while ($value -gt 0) {{
                    $bytes = ,([byte]($value -band 0xFF)) + $bytes
                    $value = $value -shr 8
                }}
                $Writer.Write([byte](0x80 + $bytes.Length))
                $Writer.Write($bytes, 0, $bytes.Length)
            }}
        }}

        function Normalize-Integer {{
            param([byte[]]$Value)
            if (-not $Value -or $Value.Length -eq 0) {{
                return ,0
            }}
            $start = 0
            while ($start -lt ($Value.Length - 1) -and $Value[$start] -eq 0) {{
                $start++
            }}
            $length = $Value.Length - $start
            $trimmed = New-Object byte[] ($length)
            [Array]::Copy($Value, $start, $trimmed, 0, $length)
            if (($trimmed[0] -band 0x80) -ne 0) {{
                $extended = New-Object byte[] ($trimmed.Length + 1)
                $extended[0] = 0
                [Array]::Copy($trimmed, 0, $extended, 1, $trimmed.Length)
                return $extended
            }}
            return $trimmed
        }}

        function Write-AsnInteger {{
            param([System.IO.BinaryWriter]$Writer, [byte[]]$Value)
            $Writer.Write([byte]0x02)
            $normalized = Normalize-Integer $Value
            Write-AsnLength $Writer $normalized.Length
            $Writer.Write($normalized, 0, $normalized.Length)
        }}

        function Export-Pkcs1 {{
            param([System.Security.Cryptography.RSA]$Rsa)
            $params = $Rsa.ExportParameters($true)
            $bodyStream = New-Object System.IO.MemoryStream
            $bodyWriter = New-Object System.IO.BinaryWriter($bodyStream)
            Write-AsnInteger $bodyWriter ([byte[]](0))
            Write-AsnInteger $bodyWriter $params.Modulus
            Write-AsnInteger $bodyWriter $params.Exponent
            Write-AsnInteger $bodyWriter $params.D
            Write-AsnInteger $bodyWriter $params.P
            Write-AsnInteger $bodyWriter $params.Q
            Write-AsnInteger $bodyWriter $params.DP
            Write-AsnInteger $bodyWriter $params.DQ
            Write-AsnInteger $bodyWriter $params.InverseQ
            $bodyWriter.Flush()
            $body = $bodyStream.ToArray()
            $seqStream = New-Object System.IO.MemoryStream
            $seqWriter = New-Object System.IO.BinaryWriter($seqStream)
            $seqWriter.Write([byte]0x30)
            Write-AsnLength $seqWriter $body.Length
            $seqWriter.Write($body, 0, $body.Length)
            $seqWriter.Flush()
            return $seqStream.ToArray()
        }}

        $certDer = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
        if ($null -eq $rsa) {{
            throw 'Unable to export RSA private key from certificate.'
        }}
        $pkcs1 = Export-Pkcs1 -Rsa $rsa

        $pemCert = "-----BEGIN CERTIFICATE-----`n" +
            [System.Convert]::ToBase64String($certDer, 'InsertLineBreaks') +
            "`n-----END CERTIFICATE-----"
        $pemKey = "-----BEGIN RSA PRIVATE KEY-----`n" +
            [System.Convert]::ToBase64String($pkcs1, 'InsertLineBreaks') +
            "`n-----END RSA PRIVATE KEY-----"

        $result = [pscustomobject]@{{
            cert = $pemCert
            key = $pemKey
        }}
        $result | ConvertTo-Json -Compress
        """
    ).strip()

    try:
        completed = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                ps_script,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        message = exc.stderr.strip() or exc.stdout.strip() or str(exc)
        raise RuntimeError(
            "PowerShell failed to provision the HTTPS certificate. "
            "Make sure you are on Windows 10+ with PowerShell 5.1+ "
            "and certificate cmdlets available.\n"
            f"Details: {message}"
        ) from exc
    payload = json.loads(completed.stdout.strip())
    cert_path.write_text(payload["cert"], encoding="utf-8")
    key_path.write_text(payload["key"], encoding="utf-8")


def main() -> None:
    args = parse_args()

    root = pathlib.Path(args.directory).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Directory '{root}' does not exist.")

    cert_path = pathlib.Path(args.cert).expanduser().resolve()
    key_path = pathlib.Path(args.key).expanduser().resolve()

    default_dns = ["localhost", "127.0.0.1", "::1", args.host]
    hostnames = args.dns or default_dns
    ensure_certificate_files(cert_path, key_path, hostnames)

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    httpd = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    httpd.daemon_threads = True
    httpd.socket = build_ssl_context(cert_path, key_path).wrap_socket(
        httpd.socket, server_side=True
    )

    site_root = root if root != pathlib.Path(".") else pathlib.Path.cwd()
    print(
        f"Serving {site_root} at https://{args.host}:{args.port} "
        f"(cert: {cert_path.name})"
    )
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
