import runpy
import unittest
from pathlib import Path

tool = runpy.run_path(str(Path(__file__).resolve().parents[1] / "scripts/print-packets.py"))
packet_url = tool["packet_url"]
render_sheet = tool["render_sheet"]
fixture = {"schema": "sia/linkbank/v0", "packets": [
    {"id": "gift-001", "title": "Care & Music", "note": "For the road",
     "items": [{"asset_id": "humkin-surprise"}]}]}


class PrintPacketTests(unittest.TestCase):
    def test_real_qr_and_local_escaping(self):
        markup = render_sheet(fixture, "gift-001", "https://example.org/p/", 2,
                              ("Soup <wrapped>",), "<script>alert(1)</script>", "N<ame>")
        self.assertIn("<svg", markup)
        self.assertIn('<path d="M', markup)
        self.assertIn("?id=gift-001", markup)
        self.assertNotIn("<script>alert", markup)
        self.assertIn("&lt;script&gt;", markup)
        self.assertIn("N&lt;ame&gt;", markup)
        self.assertEqual(markup.count('<article class="card">'), 2)

    def test_invalid_route_and_unknown_packet_rejected(self):
        for url in ("http://example.org/p/", "https://example.org/no/", "https://u:p@example.org/p/"):
            with self.assertRaises(ValueError):
                packet_url(url, "gift-001")
        with self.assertRaises(ValueError):
            render_sheet(fixture, "missing-001", "https://example.org/p/")


if __name__ == "__main__":
    unittest.main()
