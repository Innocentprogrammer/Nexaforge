import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("nexainvite")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# Log every task failure and retry in one place. Task arguments are deliberately
# not logged: some carry credentials (e.g. a password-reset link).
import logging  # noqa: E402

from celery.signals import task_failure, task_retry  # noqa: E402

_task_logger = logging.getLogger("celery.tasks")


@task_failure.connect
def _log_task_failure(sender=None, task_id=None, exception=None, **kwargs):
    _task_logger.error(
        "Celery task failed: %s",
        getattr(sender, "name", sender),
        extra={"task_id": task_id, "error_type": type(exception).__name__},
        exc_info=(type(exception), exception, exception.__traceback__) if exception else None,
    )


@task_retry.connect
def _log_task_retry(sender=None, request=None, reason=None, **kwargs):
    _task_logger.warning(
        "Celery task retrying: %s",
        getattr(sender, "name", sender),
        extra={"task_id": getattr(request, "id", None), "reason": str(reason)[:500]},
    )
