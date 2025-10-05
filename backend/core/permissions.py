from rest_framework import permissions
from accounts.models import CoachAssignment


class IsOwnerOrCoach(permissions.BasePermission):
    """
    Custom permission to allow:
    - Athletes to access their own data
    - Coaches to access their assigned athletes' data
    """
    
    def has_permission(self, request, view):
        """Check authentication first"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Get the athlete (owner) of the object
        if hasattr(obj, 'athlete'):
            athlete = obj.athlete
        elif hasattr(obj, 'user') and obj.user.is_athlete():
            athlete = obj.user
        elif hasattr(obj, 'profile') and hasattr(obj.profile, 'user'):
            athlete = obj.profile.user
        else:
            # If we can't determine the athlete, deny access
            return False
        
        # Athletes can access their own data
        if request.user == athlete:
            return True
        
        # Coaches can access their assigned athletes' data
        if request.user.is_coach():
            return CoachAssignment.objects.filter(
                coach=request.user,
                mentee=athlete,
                is_active=True
            ).exists()
        
        return False


class IsOwner(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to access it.
    """
    
    def has_permission(self, request, view):
        """Check authentication first"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Get the owner of the object
        if hasattr(obj, 'user'):
            owner = obj.user
        elif hasattr(obj, 'athlete'):
            owner = obj.athlete
        elif hasattr(obj, 'profile') and hasattr(obj.profile, 'user'):
            owner = obj.profile.user
        else:
            # If we can't determine the owner, deny access
            return False
        
        return request.user == owner


class IsCoachOrReadOnly(permissions.BasePermission):
    """
    Custom permission to allow coaches to modify, others to read only.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_coach()


class IsAthleteOwner(permissions.BasePermission):
    """
    Custom permission specifically for athlete-owned resources.
    """
    
    def has_permission(self, request, view):
        """Check authentication first"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Get the athlete
        if hasattr(obj, 'athlete'):
            athlete = obj.athlete
        elif hasattr(obj, 'user') and obj.user.is_athlete():
            athlete = obj.user
        else:
            return False
        
        return request.user == athlete and request.user.is_athlete()


class IsCoachOwner(permissions.BasePermission):
    """
    Custom permission specifically for coach-owned resources.
    """
    
    def has_permission(self, request, view):
        """Check authentication first"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Get the coach
        if hasattr(obj, 'user') and obj.user.is_coach():
            coach = obj.user
        elif hasattr(obj, 'profile') and hasattr(obj.profile, 'user') and obj.profile.user.is_coach():
            coach = obj.profile.user
        else:
            return False
        
        return request.user == coach and request.user.is_coach()


class CanAccessCoachingData(permissions.BasePermission):
    """
    Permission for coach-athlete relationship data.
    Allows both coach and athlete to view the relationship data.
    """
    
    def has_permission(self, request, view):
        """Check authentication first"""
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # For CoachAssignment objects
        if hasattr(obj, 'coach') and hasattr(obj, 'mentee'):
            return request.user in [obj.coach, obj.mentee]
        
        return False


class IsPublicRaceResults(permissions.BasePermission):
    """
    Permission for public access to completed race results (optional).
    """
    
    def has_permission(self, request, view):
        # Only allow GET requests for public access
        return request.method in permissions.SAFE_METHODS
    
    def has_object_permission(self, request, view, obj):
        # Only allow access to completed races
        if hasattr(obj, 'is_completed'):
            return obj.is_completed
        return False


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission to only allow verified users.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_verified


# Combined permissions for common use cases
class IsOwnerOrCoachAndAuthenticated(permissions.BasePermission):
    """
    Combines authentication check with IsOwnerOrCoach
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        permission = IsOwnerOrCoach()
        return permission.has_object_permission(request, view, obj)


class IsOwnerAndAuthenticated(permissions.BasePermission):
    """
    Combines authentication check with IsOwner
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        permission = IsOwner()
        return permission.has_object_permission(request, view, obj)