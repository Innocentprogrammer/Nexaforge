"""Server-side invitation → PDF rendering.

**One renderer, parameterised by an optional guest name** — not three templates
per tier. Normal hosts get the generic document, Gold and Diamond hosts get the
same document with a personalised cover page in front of it. Anything that would
differ between tiers is a value passed in here, so the tiers cannot drift apart.

Driven off the same ``invitation_json`` (falling back to the template's
``template_json``) that ``components/invitation-canvas.tsx`` renders for the live
preview, the public ``/i/[slug]`` page and ``/invite/[token]`` — so the PDF says
what the guest sees. The keys are documented in ``frontend/src/lib/types.ts``
(``TemplateJson``): ``background_color``, ``background_color_2``, ``font_color``,
``accent_color``, ``heading_font``, ``pattern``, ``heading``, ``subheading``,
``message``.

reportlab is used rather than WeasyPrint or a headless browser: it is pure
Python with no system libraries (cairo/pango) and no Chromium download, which
keeps `pip install -r requirements.txt` working on a bare machine. The trade-off
is that the invitation is re-drawn with reportlab primitives instead of reusing
the React/CSS markup — the *data* is shared, the drawing code is not, so keep
this in sync when adding a new decorative pattern.
"""

from __future__ import annotations

import io

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen import canvas as pdf_canvas

PAGE_WIDTH, PAGE_HEIGHT = A4

#: Mirrors FONT_OPTIONS in components/invitation-canvas.tsx. reportlab ships the
#: 14 standard PDF fonts only, so each curated web font maps to its closest
#: built-in: the serif/script choices to Times, the sans choices to Helvetica.
FONT_BY_KEY = {
    "playfair": ("Times-Bold", "Times-Roman", "Times-Italic"),
    "dancing": ("Times-BoldItalic", "Times-Italic", "Times-Italic"),
    "poppins": ("Helvetica-Bold", "Helvetica", "Helvetica-Oblique"),
    "inter": ("Helvetica-Bold", "Helvetica", "Helvetica-Oblique"),
}
DEFAULT_FONTS = FONT_BY_KEY["playfair"]

FALLBACK_BACKGROUND = "#f8fafc"
FALLBACK_FONT_COLOR = "#1a1a2e"
FALLBACK_ACCENT = "#2563eb"


def _color(value, fallback: str) -> Color:
    """Parse a `#rrggbb` string from the invitation JSON, tolerating junk."""
    try:
        return HexColor(str(value))
    except Exception:
        return HexColor(fallback)


def _fonts(json_data: dict) -> tuple[str, str, str]:
    return FONT_BY_KEY.get(str(json_data.get("heading_font") or ""), DEFAULT_FONTS)


def invitation_content(invitation) -> dict:
    """The single data source the PDF and the on-page renderers share.

    ``invitation_json`` is authoritative; a key it doesn't set falls back to the
    template's ``template_json``, which is exactly what the editor's live preview
    does when a field has never been edited.
    """
    template_json = getattr(invitation.template, "template_json", None) or {}
    data = {**template_json, **(invitation.invitation_json or {})}
    data.setdefault("heading", invitation.title)
    return data


def _draw_gradient(c: pdf_canvas.Canvas, top: Color, bottom: Color, bands: int = 120) -> None:
    """Approximate the CSS linear-gradient with horizontal bands."""
    band_height = PAGE_HEIGHT / bands
    for i in range(bands):
        t = i / max(bands - 1, 1)
        c.setFillColorRGB(
            top.red + (bottom.red - top.red) * t,
            top.green + (bottom.green - top.green) * t,
            top.blue + (bottom.blue - top.blue) * t,
        )
        c.rect(0, PAGE_HEIGHT - (i + 1) * band_height, PAGE_WIDTH, band_height + 1, stroke=0, fill=1)


def _draw_pattern(c: pdf_canvas.Canvas, pattern: str, accent: Color) -> None:
    """The reportlab counterpart of PatternOverlay in invitation-canvas.tsx."""
    if pattern == "frame":
        c.setStrokeColor(accent)
        c.setLineWidth(1)
        c.rect(38, 38, PAGE_WIDTH - 76, PAGE_HEIGHT - 76, stroke=1, fill=0)
        c.setLineWidth(0.5)
        c.rect(46, 46, PAGE_WIDTH - 92, PAGE_HEIGHT - 92, stroke=1, fill=0)
    elif pattern == "dots":
        c.setFillColor(accent, alpha=0.33)
        step = 26
        y = step
        while y < PAGE_HEIGHT:
            x = step
            while x < PAGE_WIDTH:
                c.circle(x, y, 1.4, stroke=0, fill=1)
                x += step
            y += step
    elif pattern == "confetti":
        c.setFillColor(accent, alpha=0.4)
        spots = [
            (0.12, 0.80, 4), (0.85, 0.85, 5), (0.25, 0.12, 4), (0.75, 0.20, 6),
            (0.50, 0.55, 3), (0.90, 0.45, 4), (0.08, 0.40, 5), (0.62, 0.90, 3),
        ]
        for fx, fy, r in spots:
            c.circle(PAGE_WIDTH * fx, PAGE_HEIGHT * fy, r, stroke=0, fill=1)
    elif pattern in ("sparkle", "florals"):
        glyph = "*" if pattern == "sparkle" else "+"
        c.setFillColor(accent, alpha=0.55)
        c.setFont("Helvetica", 16)
        spots = (
            [(0.08, 0.90), (0.88, 0.82), (0.12, 0.18), (0.85, 0.12), (0.05, 0.50), (0.93, 0.55)]
            if pattern == "sparkle"
            else [(0.08, 0.92), (0.92, 0.92), (0.08, 0.08), (0.92, 0.08)]
        )
        for fx, fy in spots:
            c.drawCentredString(PAGE_WIDTH * fx, PAGE_HEIGHT * fy, glyph)
    c.setFillAlpha(1)
    c.setStrokeAlpha(1)


def _draw_background(c: pdf_canvas.Canvas, data: dict) -> tuple[Color, Color]:
    bg1 = _color(data.get("background_color"), FALLBACK_BACKGROUND)
    bg2 = _color(data.get("background_color_2") or data.get("background_color"), FALLBACK_BACKGROUND)
    font_color = _color(data.get("font_color") or data.get("accent_color"), FALLBACK_FONT_COLOR)
    accent = _color(data.get("accent_color"), FALLBACK_ACCENT)
    _draw_gradient(c, bg1, bg2)
    _draw_pattern(c, str(data.get("pattern") or "none"), accent)
    return font_color, accent


def _centred_paragraph(
    c: pdf_canvas.Canvas, text: str, font: str, size: int, y: float, width: float, leading: float
) -> float:
    """Draw wrapped, centred text; return the y below the last line."""
    c.setFont(font, size)
    for line in simpleSplit(text, font, size, width):
        c.drawCentredString(PAGE_WIDTH / 2, y, line)
        y -= leading
    return y


def _draw_divider(c: pdf_canvas.Canvas, accent: Color, y: float, half_width: float = 34) -> None:
    c.setStrokeColor(accent)
    c.setLineWidth(1)
    c.line(PAGE_WIDTH / 2 - half_width, y, PAGE_WIDTH / 2 + half_width, y)


def _draw_cover_page(c: pdf_canvas.Canvas, data: dict, guest_name: str) -> None:
    """Personalised first page — Gold/Diamond only.

    Uses the same wording as the ``/invite/[token]`` page's greeting so the PDF a
    guest downloads and the page they open say the same thing.
    """
    font_color, accent = _draw_background(c, data)
    heading_font, body_font, italic_font = _fonts(data)
    text_width = PAGE_WIDTH - 130

    c.setFillColor(font_color, alpha=0.7)
    c.setFont(body_font, 13)
    c.drawCentredString(PAGE_WIDTH / 2, PAGE_HEIGHT * 0.68, "You're invited")

    c.setFillColor(font_color, alpha=1)
    y = _centred_paragraph(
        c, f"Hi {guest_name}", heading_font, 34, PAGE_HEIGHT * 0.58, text_width, 42
    )

    _draw_divider(c, accent, y - 6)

    c.setFillColor(font_color, alpha=0.85)
    y = _centred_paragraph(
        c,
        str(data.get("heading") or "").strip(),
        heading_font,
        20,
        y - 42,
        text_width,
        26,
    )
    subheading = str(data.get("subheading") or "").strip()
    if subheading:
        c.setFillColor(font_color, alpha=0.7)
        y = _centred_paragraph(c, subheading, italic_font, 13, y - 10, text_width, 18)

    c.setFillColor(font_color, alpha=0.55)
    c.setFont(body_font, 10)
    c.drawCentredString(
        PAGE_WIDTH / 2, 70, "Your personal invitation follows on the next page."
    )
    c.setFillAlpha(1)
    c.showPage()


def _draw_invitation_page(c: pdf_canvas.Canvas, invitation, data: dict) -> None:
    """The invitation itself — identical for every tier."""
    font_color, accent = _draw_background(c, data)
    heading_font, body_font, italic_font = _fonts(data)
    text_width = PAGE_WIDTH - 130

    y = PAGE_HEIGHT * 0.78
    c.setFillColor(font_color, alpha=1)
    y = _centred_paragraph(
        c, str(data.get("heading") or invitation.title), heading_font, 30, y, text_width, 38
    )

    _draw_divider(c, accent, y - 4)
    y -= 40

    subheading = str(data.get("subheading") or "").strip()
    if subheading:
        c.setFillColor(font_color, alpha=0.8)
        y = _centred_paragraph(c, subheading, body_font, 15, y, text_width, 21)
        y -= 14

    if invitation.venue:
        c.setFillColor(font_color, alpha=0.65)
        y = _centred_paragraph(c, invitation.venue, body_font, 12, y, text_width, 17)
    if invitation.event_date:
        c.setFillColor(font_color, alpha=0.65)
        y = _centred_paragraph(
            c,
            invitation.event_date.strftime("%d %B %Y, %I:%M %p"),
            body_font,
            12,
            y - 2,
            text_width,
            17,
        )

    message = str(data.get("message") or "").strip()
    if message:
        c.setFillColor(font_color, alpha=0.65)
        _centred_paragraph(c, message, italic_font, 12, y - 26, text_width - 60, 18)

    c.setFillColor(font_color, alpha=0.45)
    c.setFont(body_font, 9)
    c.drawCentredString(PAGE_WIDTH / 2, 46, invitation.title)
    c.setFillAlpha(1)
    c.showPage()


def render_invitation_pdf(invitation, guest_name: str | None = None) -> bytes:
    """Render `invitation` to PDF bytes.

    :param guest_name: when given (Gold/Diamond), a personalised
        "Hi {name}" cover page is added in front of the invitation page. When
        ``None`` (Normal, or any generic download) the PDF is exactly the
        invitation page, with no name anywhere in it.
    """
    data = invitation_content(invitation)
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    title = invitation.title or "Invitation"
    c.setTitle(f"{title} — {guest_name}" if guest_name else title)
    c.setAuthor("NexaInvite")

    name = (guest_name or "").strip()
    if name:
        _draw_cover_page(c, data, name)
    _draw_invitation_page(c, invitation, data)

    c.save()
    return buffer.getvalue()


def pdf_filename(invitation, guest_name: str | None = None) -> str:
    base = invitation.slug or "invitation"
    if guest_name:
        suffix = "".join(ch if ch.isalnum() else "-" for ch in guest_name.strip().lower())
        suffix = "-".join(part for part in suffix.split("-") if part)
        if suffix:
            return f"{base}-{suffix}.pdf"
    return f"{base}.pdf"
