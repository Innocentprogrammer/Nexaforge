from django.db import migrations, models


LEGACY_PRODUCTS = {
    "nexainvite": (
        "Digital invitations & event management",
        "Design beautiful digital invitations, track RSVPs in real time, and manage your guest list — for weddings, birthdays, and corporate events.",
    ),
    "nexacrm": (
        "Customer relationship management",
        "Unified client intelligence with automated relationship mapping and retention tracking.",
    ),
    "nexaerp": (
        "Enterprise resource planning",
        "Institutional resource planning covering finance, HR, and supply chain in one system.",
    ),
    "nexaflow": (
        "Workflow automation",
        "No-code automation that connects your tools and eliminates repetitive manual work.",
    ),
    "nexaai": (
        "AI decision engine",
        "Predictive modeling and AI-assisted decision support for enterprise risk and planning.",
    ),
}


def restore_original_product_copy(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    for slug, (tagline, description) in LEGACY_PRODUCTS.items():
        Product.objects.filter(slug=slug).update(
            legacy_tagline=tagline,
            legacy_description=description,
        )


def noop_reverse(apps, schema_editor):
    # Retained product copy is intentionally not erased on migration rollback.
    pass


class Migration(migrations.Migration):
    dependencies = [("products", "0002_product_detail_fields")]

    operations = [
        migrations.AddField(
            model_name="product",
            name="legacy_tagline",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="product",
            name="legacy_description",
            field=models.TextField(blank=True),
        ),
        migrations.RunPython(restore_original_product_copy, noop_reverse),
    ]
