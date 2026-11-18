#!/usr/bin/env python3
"""LITTLE PACKET: offline printable QR handouts. No network requests, writes only --out."""
from __future__ import annotations
import argparse
import html
import json
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit

ID_PATTERN = __import__("re").compile(r"^[a-z0-9](?:[a-z0-9-]{2,38}[a-z0-9])$")


def packet_url(base_url: str, packet_id: str) -> str:
    if not ID_PATTERN.fullmatch(packet_id):
        raise ValueError("invalid packet ID")
    u = urlsplit(base_url)
    if u.scheme != "https" or not u.hostname or u.username or u.password or u.query or u.fragment or not u.path.endswith("/p/"):
        raise ValueError("base URL must be an HTTPS public /p/ route with no query, fragment or credentials")
    return urlunsplit((u.scheme, u.netloc, u.path, urlencode({"id": packet_id}), ""))


def qr_svg(url: str) -> str:
    try:
        import qrcode
    except ImportError as exc:
        raise RuntimeError('Install qrcode locally: python3 -m pip install "qrcode==8.2"') from exc
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=4, box_size=1)
    qr.add_data(url)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    n = len(matrix)
    path = "".join(f"M{x} {y}h1v1h-1z" for y, row in enumerate(matrix) for x, black in enumerate(row) if black)
    return (f'<svg role="img" aria-label="QR code for packet" viewBox="0 0 {n} {n}" '
            'xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
            f'<rect width="{n}" height="{n}" fill="white"/>'
            f'<path d="{path}" fill="#292038"/></svg>')


def render_sheet(registry: dict, packet_id: str, base_url: str, count: int = 6,
                 contents: tuple[str, ...] = (), message: str = "", recipient: str = "") -> str:
    if registry.get("schema") != "sia/linkbank/v0":
        raise ValueError("unrecognized registry")
    if not 1 <= count <= 60:
        raise ValueError("count must be 1..60")
    if len(message) > 300 or len(recipient) > 100 or len(contents) > 12 or any(len(s) > 80 for s in contents):
        raise ValueError("local print text too long")
    matches = [p for p in registry.get("packets", []) if p.get("id") == packet_id]
    if len(matches) != 1:
        raise ValueError("packet must exist exactly once in public registry")
    packet = matches[0]
    url = packet_url(base_url, packet_id)
    svg = qr_svg(url)
    title = html.escape(packet["title"])
    detail = html.escape(message or packet.get("note", "A little something for you."))
    to = f'<p class="to">FOR: {html.escape(recipient)}</p>' if recipient else ""
    goods = "".join("<li>" + html.escape(item) + "</li>" for item in contents)
    checklist = f'<ul>{goods}</ul>' if goods else ""
    safe_url = html.escape(url, quote=True)
    card = (f'<article class="card"><header>LITTLE PACKET ✳ <small>GIVEN FREELY</small></header>'
            f'<h2>{title}</h2><p>{detail}</p>{to}{checklist}'
            f'<div class="bottom"><div class="qr">{svg}</div><div class="instruction">'
            f'<strong>SCAN FOR YOUR GIFT</strong><p>Nothing to sign up for. Pass it on if you like.</p>'
            f'<div class="url">{safe_url}</div></div></div>'
            '<footer>A LITTLE SOMETHING FOR THE ROAD</footer></article>')
    pages = [f'<section class="sheet">{"".join(card for _ in range(min(6, count-i)))}</section>'
             for i in range(0, count, 6)]
    stamp = '<p class="preview">DRY RUN · DO NOT DISTRIBUTE EXAMPLE.ORG LINKS</p>' if urlsplit(base_url).hostname == "example.org" else ""
    return ('''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LITTLE PACKET · Print sheet</title><style>
*{box-sizing:border-box}body{font:14px/1.3 system-ui,sans-serif;color:#292038;background:#eee0d7;margin:0}
.tools{padding:12px;text-align:center}.tools button{padding:10px 20px;background:#292038;color:#fff;border:0;border-radius:22px;font-weight:800;cursor:pointer}
.preview{text-align:center;font-weight:800;color:#a03735}
.sheet{width:8.1in;min-height:10.2in;margin:18px auto;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,3.3in);gap:.08in}
.card{background:#fff7e6;border:2px dashed #73556f;padding:13px 15px;break-inside:avoid;overflow:hidden;display:flex;flex-direction:column}
.card:nth-child(even){background:#f4e9ee}.card header{display:flex;justify-content:space-between;font-size:12px;font-weight:950;letter-spacing:.07em}
.card header small{font-size:9px}h2{font:800 26px/1 Georgia,serif;margin:13px 0 5px}.card p{margin:4px 0;font-size:11px}
.card .to{font-weight:bold}.card ul{padding-left:17px;margin:3px 0;font-size:10px}.bottom{display:flex;align-items:center;gap:10px;margin-top:auto}
.qr{background:#fff;padding:5px;min-width:99px}.qr svg{display:block;width:91px;height:91px}
.instruction{min-width:0;font-size:11px}.instruction strong{font-size:11px}.url{font-size:8px;font-weight:750;overflow-wrap:anywhere}
.card footer{border-top:1px solid #ae9caa;padding-top:5px;margin-top:8px;font-size:9px;font-weight:800;letter-spacing:.1em}
@media print{@page{size:letter;margin:.18in}body{background:#fff}.tools,.preview{display:none}
.sheet{width:100%;min-height:0;height:10.5in;margin:0;page-break-after:always}}
@media(max-width:700px){.sheet{width:98vw;min-height:0;grid-template-columns:1fr;grid-template-rows:none}.card{min-height:3.3in}}
</style></head><body><nav class="tools"><button onclick="window.print()">PRINT HANDOUTS</button></nav>'''
            + stamp + "".join(pages) + '</body></html>')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", default=str(Path(__file__).resolve().parents[1] / "site/registry.json"))
    parser.add_argument("--id", required=True)
    parser.add_argument("--base-url", required=True, help="Verified published HTTPS URL ending with /p/")
    parser.add_argument("--count", type=int, default=6)
    parser.add_argument("--item", action="append", default=[], help="Physical item to print on the card; local only")
    parser.add_argument("--message", default="", help="Local print message, never added to registry")
    parser.add_argument("--recipient", default="", help="Optional private printed name, never added to registry")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()
    registry = json.loads(Path(args.registry).read_text(encoding="utf-8"))
    result = render_sheet(registry, args.id, args.base_url, args.count, tuple(args.item), args.message, args.recipient)
    Path(args.out).write_text(result, encoding="utf-8")
    print("Prepared", args.count, "cards in", args.out)
    print("HOLD: Verify the public HTTPS route and playback on two devices BEFORE distributing printed QRs.")


if __name__ == "__main__":
    main()
