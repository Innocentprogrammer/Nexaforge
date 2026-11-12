from PIL import Image, UnidentifiedImageError
from rest_framework import serializers

from .models import MediaAsset


MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 8000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


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
            self._image_metadata = (image.format, image.width, image.height)
            safe_extension = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[image.format]
            uploaded_file.name = f"upload{safe_extension}"
            uploaded_file.seek(0)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise serializers.ValidationError("The uploaded file is not a valid image.")
        return uploaded_file

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
