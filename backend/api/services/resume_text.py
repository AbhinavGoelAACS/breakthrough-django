"""Pull plain text out of an uploaded resume.

Kept apart from the view so the application endpoint and the re-extraction
management command cannot drift apart.

Failure is reported, never disguised. The previous version returned the string
"Resume uploaded. Manual review required." whenever extraction failed, which
the screening code then scored as if it were the candidate's resume — a real
applicant whose CV listed all ten required skills came out at 1% with
"skills 0/10", because those four words are all the scorer ever saw. Returning
an empty string instead makes the screening code say the resume could not be
read, which is the truth and is visible in the admin queue.
"""

import logging
import os
import xml.etree.ElementTree as ElementTree
import zipfile

logger = logging.getLogger(__name__)

PDF_EXTENSIONS = {".pdf"}
DOCX_EXTENSIONS = {".docx", ".doc"}

# WordprocessingML text nodes.
_W_NAMESPACE = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def extract_resume_text(path):
    """Return the text of the resume at `path`, or "" when it cannot be read.

    An empty return is meaningful: callers must treat it as "not screened"
    rather than as an empty resume.
    """
    if not path or not os.path.exists(path):
        logger.warning("Resume file missing, cannot extract text: %s", path)
        return ""

    extension = os.path.splitext(path)[1].lower()

    if extension in PDF_EXTENSIONS:
        return _extract_pdf(path)
    if extension in DOCX_EXTENSIONS:
        return _extract_docx(path)

    logger.warning("No resume extractor for '%s' files: %s", extension, path)
    return ""


def _extract_pdf(path):
    try:
        import pypdf
    except ImportError:
        # This is the failure that made every PDF resume score ~1%. It needs to
        # be loud: on cPanel the deploy only uploads files, so a new dependency
        # is not installed until someone runs Pip Install in Setup Python App.
        logger.error(
            "pypdf is not installed, so no PDF resume can be read. Install the "
            "requirements on this server (cPanel > Setup Python App > Run Pip "
            "Install), then re-run: manage.py rescore_applications --reextract"
        )
        return ""

    try:
        reader = pypdf.PdfReader(path)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        logger.exception("Could not read PDF resume: %s", path)
        return ""

    if not text.strip():
        # Scanned CVs are images; there is no text layer to find.
        logger.warning("PDF resume has no extractable text layer: %s", path)
        return ""
    return text


def _extract_docx(path):
    try:
        from docx import Document
    except ImportError:
        logger.warning("python-docx is not installed; falling back to the stdlib reader")
    else:
        try:
            document = Document(path)
            text = "\n".join(p.text for p in document.paragraphs if p.text.strip())
            if text.strip():
                return text
        except Exception:
            logger.exception("python-docx could not read %s; trying the stdlib reader", path)

    return _extract_docx_stdlib(path)


def _extract_docx_stdlib(path):
    """Read a .docx with only the standard library.

    A .docx is a zip of XML, so this needs no third-party package at all —
    worth having because dependencies are not installed by the deploy, and a
    resume that cannot be read scores zero.
    """
    try:
        with zipfile.ZipFile(path) as archive:
            xml_bytes = archive.read("word/document.xml")
    except (zipfile.BadZipFile, KeyError, OSError):
        # A real .doc (OLE2, not zip) lands here; there is no stdlib reader.
        logger.warning("Not a readable .docx archive: %s", path)
        return ""

    try:
        root = ElementTree.fromstring(xml_bytes)
    except ElementTree.ParseError:
        logger.exception("Malformed document.xml in %s", path)
        return ""

    parts = [node.text for node in root.iter(f"{_W_NAMESPACE}t") if node.text]
    text = " ".join(parts).strip()
    if not text:
        logger.warning("No text found in %s", path)
    return text
