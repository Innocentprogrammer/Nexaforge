from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("products", "0001_initial")]
    operations = [
        migrations.AddField(model_name="product", name="features", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="product", name="target_audience", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="product", name="highlights", field=models.JSONField(blank=True, default=list)),
    ]
