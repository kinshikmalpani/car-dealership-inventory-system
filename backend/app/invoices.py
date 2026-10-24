"""Downloadable, printable UTF-8 invoice; no external assets or scripts."""
from decimal import Decimal
from html import escape


def inr(value):
    whole, fraction = f"{Decimal(value):.2f}".split(".")
    tail = whole[-3:]
    head = whole[:-3]
    groups = []
    while head:
        groups.insert(0, head[-2:])
        head = head[:-2]
    return "₹" + ",".join(groups + [tail]) + "." + fraction


def invoice_html(order):
    summary = order.summary
    lines = [("Vehicle price", summary["vehicle_price"]), ("Registration estimate (not quoted if zero)", summary["registration_estimate"]), ("Insurance estimate (not quoted if zero)", summary["insurance_estimate"])]
    lines += [(item["name"] + " (estimate)", item["price"]) for item in summary["accessories"]]
    rows = "".join(f"<tr><td>{escape(name)}</td><td>{inr(value)}</td></tr>" for name, value in lines)
    car = summary["vehicle"]
    return f'''<!doctype html><html lang="en"><meta charset="UTF-8"><title>Invoice {escape(order.reference)}</title>
<style>body{{font:16px Arial,sans-serif;max-width:800px;margin:50px auto;padding:25px;color:#243c33}}h1{{font-size:32px}}table{{width:100%;border-collapse:collapse;margin:30px 0}}td{{padding:14px 0;border-bottom:1px solid #ddd}}td:last-child{{text-align:right}}.total{{font-weight:bold;font-size:22px}}aside{{background:#edf3e9;padding:20px}}@media print{{body{{margin:0}}}}</style>
<h1>motorroom.</h1><h2>Simulated purchase invoice</h2><p>Order reference: <strong>{escape(order.reference)}</strong><br>Issued: {escape(order.created_at)}</p>
<p>Customer: {escape(order.buyer_name)}<br>{escape(order.customer_email)}<br>{escape(order.city)}</p>
<h2>{escape(car['make'])} {escape(car['model'])}</h2><p>Quantity purchased: 1 · Currency: INR</p>
<table>{rows}<tr class="total"><td>Total estimate</td><td>{inr(summary['total'])}</td></tr></table>
<aside><strong>Payment simulated — no money collected.</strong><p>This is a demo purchase record, not a GST tax invoice or evidence of payment.</p><p>{escape(summary['estimate_note'])}</p></aside>
<p>Use your browser’s Print → Save as PDF to keep a PDF copy.</p></html>'''
