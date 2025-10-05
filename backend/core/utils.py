import uuid
import os
from typing import Any, Dict, Optional
from django.core.exceptions import ValidationError
from django.utils.text import slugify


def generate_unique_filename(instance, filename: str) -> str:
    """
    Generate a unique filename for uploaded files.
    """
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return filename


def validate_file_size(file, max_size_mb: int = 5):
    """
    Validate file size.
    """
    if file.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f'File size cannot exceed {max_size_mb}MB.')


def create_slug_from_title(title: str, max_length: int = 50) -> str:
    """
    Create a URL-friendly slug from a title.
    """
    return slugify(title)[:max_length]


def safe_delete_file(file_path: str) -> bool:
    """
    Safely delete a file from filesystem.
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False


class APIResponse:
    """
    Standardized API response format.
    """
    
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> Dict[str, Any]:
        return {
            'success': True,
            'message': message,
            'data': data,
            'status_code': status_code
        }
    
    @staticmethod
    def error(message: str = "Error occurred", errors: Optional[Dict] = None, status_code: int = 400) -> Dict[str, Any]:
        response = {
            'success': False,
            'message': message,
            'status_code': status_code
        }
        if errors:
            response['errors'] = errors
        return response