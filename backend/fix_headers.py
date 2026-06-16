"""
Audit which pages have hardcoded main-header / main-footer,
then auto-replace them all with the shared component placeholders.

Strategy:
  - Update components/header.html with auth-aware nav (same as index.html)
  - Update components/footer.html (already good)
  - Update components.js to add auth-aware logic after injection
  - For every .html page with a hardcoded header: strip it, insert
    <div id="header-placeholder"></div>
  - For every .html page with a hardcoded footer: strip it, insert
    <div id="footer-placeholder"></div>
  - Add <script src="js/components.js"> and <script src="js/api.js">
    to every page that doesn't already have it
"""
import os, re, glob

ROOT = r'c:\Users\Soumya Ranjan\Desktop\MOTOHUB MK2'

# ── Patterns to detect and remove hardcoded blocks ────────────────────────────

# Matches the full top-bar + main-header block
HEADER_PATTERN = re.compile(
    r'<!--\s*Top Bar\s*-->.*?</header>',
    re.DOTALL
)

# Matches main-footer block (older style - whole <footer> tag)
FOOTER_PATTERN = re.compile(
    r'<footer\s+class=["\']main-footer["\'].*?</footer>',
    re.DOTALL
)

# Dashboards that should NOT get the public header (they have their own nav)
SKIP_HEADER = {
    'dashboard-admin.html', 'dashboard-moderator.html',
    'dashboard-garage.html', 'dashboard-customer.html',
    'gateway-paytm.html', 'gateway-billdesk.html',
    'coming-soon.html', 'order-success.html',
}
SKIP_FOOTER = {
    'dashboard-admin.html', 'dashboard-moderator.html',
    'dashboard-garage.html',
    'gateway-paytm.html', 'gateway-billdesk.html',
    'coming-soon.html', 'order-success.html',
}

HEADER_PLACEHOLDER = '\n    <!-- Header Placeholder -->\n    <div id="header-placeholder"></div>\n'
FOOTER_PLACEHOLDER = '\n    <!-- Footer Placeholder -->\n    <div id="footer-placeholder"></div>\n'

pages = sorted(glob.glob(os.path.join(ROOT, '*.html')))

modified = []
skipped  = []

for path in pages:
    fname = os.path.basename(path)
    try:
        with open(path, encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f'  [SKIP] {fname} - read error: {e}')
        continue

    original = content
    changed  = False

    # ── Replace header ──────────────────────────────────────────
    if fname not in SKIP_HEADER and 'id="header-placeholder"' not in content:
        m = HEADER_PATTERN.search(content)
        if m:
            content = content[:m.start()] + HEADER_PLACEHOLDER + content[m.end():]
            changed = True
            print(f'  [HEADER] {fname}')

    # ── Replace footer ──────────────────────────────────────────
    if fname not in SKIP_FOOTER and 'id="footer-placeholder"' not in content:
        m = FOOTER_PATTERN.search(content)
        if m:
            content = content[:m.start()] + FOOTER_PLACEHOLDER + content[m.end():]
            changed = True
            print(f'  [FOOTER] {fname}')

    # ── Ensure api.js + components.js are loaded ────────────────
    if fname not in SKIP_HEADER and changed:
        if 'js/api.js' not in content:
            content = content.replace(
                '<script src="js/script.js"></script>',
                '<script src="js/api.js"></script>\n    <script src="js/script.js"></script>'
            )
        if 'js/components.js' not in content:
            # Add before </head>
            content = content.replace(
                '</head>',
                '    <script src="js/components.js" defer></script>\n</head>'
            )

    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        modified.append(fname)
    else:
        skipped.append(fname)

print(f'\n✅ Modified {len(modified)} files:')
for f in modified:
    print(f'   • {f}')
print(f'\n⏩ Skipped {len(skipped)} files (no changes needed or excluded):')
for f in skipped:
    print(f'   - {f}')
