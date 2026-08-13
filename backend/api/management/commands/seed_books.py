"""Seed the books catalogue with sample data.

Run once on a fresh database so the /books and /proceedings pages have
something to render:

    python manage.py seed_books

The titles and ISBNs below are placeholders — replace them with the real
catalogue before the pages go live. Re-running is safe: every record is
matched on its natural key and updated rather than duplicated.
"""

from datetime import date

from django.core.management.base import BaseCommand

from api.models import Book, BookChapter, BookContributor, BookSeries, DownloadAsset

SERIES = [
    ("BSAS", "Breakthrough Studies in Applied Sciences",
     "Single-author monographs in engineering, materials and the environmental sciences"),
    ("BSHS", "Breakthrough Studies in the Humanities & Social Sciences",
     "History, sociology and political economy, with a South Asian focus"),
    ("BCP", "Breakthrough Conference Proceedings",
     "Edited volumes from academic conferences, published under our proceedings programme"),
    ("BTX", "Breakthrough Textbooks",
     "Course texts for undergraduate and postgraduate programmes"),
]

BOOKS = [
    dict(slug="groundwater-governance-indo-gangetic-plain",
         title="Groundwater Governance in the Indo-Gangetic Plain",
         series="BSAS", volume_no=12, kind="monograph", isbn="978-93-XXXXX-12-4",
         pages=312, published_on=date(2026, 2, 10), open_access=False,
         contributors=[("Meera Krishnan", "author")]),
    dict(slug="advances-in-computational-intelligence",
         title="Advances in Computational Intelligence",
         series="BCP", volume_no=None, kind="proceedings", isbn="978-93-XXXXX-09-4",
         pages=486, published_on=date(2025, 11, 4), open_access=False,
         conference_name="ICCIS 2025",
         contributors=[("S. Rao", "editor"), ("A. Banerjee", "editor")]),
    dict(slug="caste-land-and-the-colonial-archive",
         title="Caste, Land and the Colonial Archive",
         series="BSHS", volume_no=4, kind="monograph", isbn="978-93-XXXXX-07-0",
         pages=268, published_on=date(2025, 8, 19), open_access=False,
         contributors=[("Devika Nair", "author")]),
    dict(slug="applied-biostatistics-for-health-sciences",
         title="Applied Biostatistics for Health Sciences",
         series="BTX", volume_no=None, kind="textbook", isbn="978-93-XXXXX-05-6",
         pages=402, published_on=date(2025, 6, 2), open_access=False,
         edition="2nd edition", contributors=[("P. Venkatesh", "author")]),
    dict(slug="climate-adaptation-in-coastal-tamil-nadu",
         title="Climate Adaptation in Coastal Tamil Nadu",
         series="BSAS", volume_no=None, kind="edited", isbn="978-93-XXXXX-04-9",
         pages=344, published_on=date(2025, 3, 27), open_access=True,
         contributors=[("K. Iyer", "editor"), ("R. Fernandes", "editor"),
                       ("S. Rahman", "editor"), ("A. Menon", "editor")]),
    dict(slug="materials-for-next-generation-energy-storage",
         title="Materials for Next-Generation Energy Storage",
         series="BSAS", volume_no=11, kind="monograph", isbn="978-93-XXXXX-02-5",
         pages=290, published_on=date(2024, 10, 15), open_access=False,
         contributors=[("A. Sharma", "author")]),
    dict(slug="readings-in-south-asian-political-economy",
         title="Readings in South Asian Political Economy",
         series="BSHS", volume_no=3, kind="edited", isbn="978-93-XXXXX-01-8",
         pages=358, published_on=date(2024, 7, 8), open_access=False,
         contributors=[("N. Chatterjee", "editor")]),
    dict(slug="foundations-of-environmental-engineering",
         title="Foundations of Environmental Engineering",
         series="BTX", volume_no=None, kind="textbook", isbn="978-93-XXXXX-00-1",
         pages=426, published_on=date(2024, 1, 22), open_access=False,
         edition="1st edition",
         contributors=[("L. Thomas", "author"), ("G. Prasad", "author")]),
]

# Chapters for the proceedings volume, so /books/<slug> has contents to show
CHAPTERS = {
    "advances-in-computational-intelligence": [
        ("A Survey of Graph Neural Networks for Traffic Forecasting", "R. Iyer, M. Das", 1, 18),
        ("Federated Learning under Intermittent Connectivity", "S. Nandi, P. Kulkarni", 19, 37),
        ("Explainability Methods for Clinical Decision Support", "A. Bose", 38, 54),
        ("Low-Resource Machine Translation for Indian Languages", "V. Pillai, T. Reddy", 55, 76),
        ("Adversarial Robustness in Remote Sensing Models", "K. Mehta", 77, 95),
    ],
}

DOWNLOADS = [
    ("Paper template — Word", "author", "proceedings/author-template.docx", "DOCX", 245760, None, 1),
    ("Paper template — LaTeX2e", "author", "proceedings/author-template-latex.zip", "ZIP", 1153434, None, 2),
    ("Author instructions", "author", "proceedings/author-instructions.pdf", "PDF", 389120, None, 3),
    ("Volume editor guidelines", "editor", "proceedings/editor-guidelines.pdf", "PDF", 532480, None, 1),
    ("Front matter template", "editor", "proceedings/frontmatter-template.docx", "DOCX", 98304, None, 2),
    ("Licence to publish", "forms", "proceedings/licence-to-publish.pdf", "PDF", 143360, "One per paper", 1),
    ("Permissions checklist", "forms", "proceedings/permissions-checklist.xlsx", "XLSX", 49152, None, 2),
    ("Accessibility & alt-text guide", "reference", "proceedings/accessibility-guide.pdf", "PDF", 215040, None, 1),
]


class Command(BaseCommand):
    help = "Seeds sample book series, books and proceedings downloads."

    def handle(self, *args, **options):
        series_map = {}
        for abbr, name, description in SERIES:
            obj, created = BookSeries.objects.update_or_create(
                abbreviation=abbr,
                defaults={"name": name, "description": description, "is_active": True},
            )
            series_map[abbr] = obj
            self.stdout.write(f"  {'Created' if created else 'Updated'} series {abbr}")

        for entry in BOOKS:
            contributors = entry.pop("contributors")
            series_abbr = entry.pop("series")
            open_access = entry.pop("open_access")
            book, created = Book.objects.update_or_create(
                slug=entry.pop("slug"),
                defaults={
                    **entry,
                    "series": series_map.get(series_abbr),
                    "is_open_access": open_access,
                    "is_published": True,
                    "production_status": "published",
                },
            )
            book.contributors.all().delete()
            BookContributor.objects.bulk_create([
                BookContributor(book=book, name=name, role=role, order=index)
                for index, (name, role) in enumerate(contributors)
            ])
            chapters = CHAPTERS.get(book.slug)
            if chapters:
                book.chapters.all().delete()
                BookChapter.objects.bulk_create([
                    BookChapter(
                        book=book, title=title, authors=authors,
                        start_page=start, end_page=end, order=index,
                        doi=f"10.00000/{book.slug[:12]}.{index + 1:03d}",
                    )
                    for index, (title, authors, start, end) in enumerate(chapters)
                ])

            self.stdout.write(f"  {'Created' if created else 'Updated'} book {book.title}")

        for label, audience, path, fmt, size, note, order in DOWNLOADS:
            DownloadAsset.objects.update_or_create(
                label=label,
                defaults={
                    "audience": audience, "file": path, "file_format": fmt,
                    "size_bytes": size, "note": note, "order": order,
                    "revised_on": date(2026, 3, 1), "is_active": True,
                },
            )
        self.stdout.write(f"  Seeded {len(DOWNLOADS)} downloads")

        self.stdout.write(self.style.SUCCESS("\nDone. Replace placeholder titles before going live."))
