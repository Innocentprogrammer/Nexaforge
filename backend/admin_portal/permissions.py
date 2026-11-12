from rest_framework.permissions import BasePermission


class IsNexaStaff(BasePermission):
    """Only authenticated Django staff accounts may use the admin portal."""

    message = "Staff access is required to use the NexaInvite admin portal."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
