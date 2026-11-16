from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers

from .models import MediaAsset


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 8000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
SAFE_EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def strip_metadata(image: Image.Image, image_format: str) -> tuple[bytes, int, int]:
    """Re-encode an upload without EXIF/XMP/ICC text chunks.

    Phone photos carry EXIF, often with GPS coordinates, and uploads are public
    on invitation pages. The camera's orientation tag is applied to the pixels
    first, so the picture still appears the right way up once the tag is gone.
    Animated images are re-saved frame by frame without rotation.
    """
    out = BytesIO()
    if getattr(image, "is_animated", False):
        image.save(out, format=image_format, save_all=True)
        return out.getvalue(), image.width, image.height

    image = ImageOps.exif_transpose(image)
    if image_format == "JPEG":
        if image.mode not in ("RGB", "L", "CMYK"):
            image = image.convert("RGB")
        image.save(out, format="JPEG", quality=90, optimize=True)
    elif image_format == "PNG":
        image.save(out, format="PNG", optimize=True)
    else:  # WEBP
        image.save(out, format="WEBP", quality=90)
    return out.getvalue(), image.width, image.height


class MediaAssetSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = [
            "id", "title", "file", "url", "mime_type", "file_size",
            "width", "height", "created_at",
        ]
        read_only_fields = ["id", "url", "mime_type", "file_size", "width", "height", "created_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def validate_file(self, uploaded_file):
        if uploaded_file.size > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("Image must be 10 MB or smaller.")
        try:
            image = Image.open(uploaded_file)
            image.verify()
            uploaded_file.seek(0)
            image = Image.open(uploaded_file)
            if image.format not in ALLOWED_FORMATS:
                raise serializers.ValidationError("Only JPEG, PNG and WebP images are supported.")
            if image.width > MAX_IMAGE_DIMENSION or image.height > MAX_IMAGE_DIMENSION:
                raise serializers.ValidationError("Image dimensions must not exceed 8000 × 8000 pixels.")
            image_format = image.format
            data, width, height = strip_metadata(image, image_format)
            self._image_metadata = (image_format, width, height)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError("The uploaded file is not a valid image.")
        return ContentFile(data, name=f"upload{SAFE_EXTENSIONS[image_format]}")

    def create(self, validated_data):
        uploaded_file = validated_data["file"]
        image_format, width, height = self._image_metadata
        validated_data.update(
            mime_type=f"image/{'jpeg' if image_format == 'JPEG' else image_format.lower()}",
            file_size=uploaded_file.size,
            width=width,
            height=height,
        )
        return super().create(validated_data)
