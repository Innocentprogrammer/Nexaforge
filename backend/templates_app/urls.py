from rest_framework.routers import DefaultRouter

from .views import InvitationTemplateViewSet

router = DefaultRouter()
router.register("templates", InvitationTemplateViewSet, basename="template")

urlpatterns = router.urls
