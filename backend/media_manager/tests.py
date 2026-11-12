from io import BytesIO
from PIL import Image
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status

from .models import MediaAsset

User = get_user_model()


def make_png(name="test.png", size=(40, 40)):
    buffer = BytesIO()
    Image.new("RGB", size, color=(180, 80, 120)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class MediaAssetAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="media", email="media@example.com", password="StrongPass123!")
        self.other = User.objects.create_user(username="other", email="other@example.com", password="StrongPass123!")

    def test_upload_requires_authentication(self):
        response = self.client.post("/api/v1/media/", {"file": make_png()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_can_upload_and_list_own_image(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/v1/media/", {"title": "Couple photo", "file": make_png()}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Couple photo")
        self.assertEqual(response.data["width"], 40)
        self.assertEqual(MediaAsset.objects.filter(user=self.user).count(), 1)
        self.assertEqual(self.client.get("/api/v1/media/").data["count"], 1)

    def test_user_cannot_see_or_delete_another_users_media(self):
        asset = MediaAsset.objects.create(user=self.other, file=make_png())
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get(f"/api/v1/media/{asset.id}/").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(f"/api/v1/media/{asset.id}/").status_code, status.HTTP_404_NOT_FOUND)

    def test_non_image_upload_is_rejected(self):
        self.client.force_authenticate(self.user)
        invalid = SimpleUploadedFile("not-image.txt", b"hello", content_type="text/plain")
        response = self.client.post("/api/v1/media/", {"file": invalid}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
