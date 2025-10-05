import django_filters
from django.db.models import Q
from .models import AthleticProfile, Achievement, Certification, CoachAchievement


class AthleticProfileFilter(django_filters.FilterSet):
    """Custom filter for Athletic Profile with JSONField handling"""
    
    experience_years = django_filters.NumberFilter()
    experience_years__gte = django_filters.NumberFilter(field_name='experience_years', lookup_expr='gte')
    experience_years__lte = django_filters.NumberFilter(field_name='experience_years', lookup_expr='lte')
    
    # Custom filter for sports_involved JSONField
    sport = django_filters.CharFilter(method='filter_by_sport', help_text='Filter by sport (e.g., running, cycling)')
    sports = django_filters.CharFilter(method='filter_by_sports', help_text='Filter by multiple sports (comma-separated)')
    
    class Meta:
        model = AthleticProfile
        fields = {
            'experience_years': ['exact', 'gte', 'lte'],
        }
    
    def filter_by_sport(self, queryset, name, value):
        """Filter profiles that include the specified sport"""
        if value:
            return queryset.filter(sports_involved__icontains=value)
        return queryset
    
    def filter_by_sports(self, queryset, name, value):
        """Filter profiles that include any of the specified sports (comma-separated)"""
        if value:
            sports_list = [sport.strip() for sport in value.split(',')]
            q_objects = Q()
            for sport in sports_list:
                q_objects |= Q(sports_involved__icontains=sport)
            return queryset.filter(q_objects)
        return queryset


class AchievementFilter(django_filters.FilterSet):
    """Custom filter for Achievement model"""
    
    year = django_filters.NumberFilter()
    year__gte = django_filters.NumberFilter(field_name='year', lookup_expr='gte')
    year__lte = django_filters.NumberFilter(field_name='year', lookup_expr='lte')
    category = django_filters.ChoiceFilter(choices=Achievement.CATEGORY_CHOICES)
    
    class Meta:
        model = Achievement
        fields = {
            'category': ['exact'],
            'year': ['exact', 'gte', 'lte'],
        }


class CertificationFilter(django_filters.FilterSet):
    """Custom filter for Certification model"""
    
    year = django_filters.NumberFilter()
    year__gte = django_filters.NumberFilter(field_name='year', lookup_expr='gte')
    year__lte = django_filters.NumberFilter(field_name='year', lookup_expr='lte')
    sport = django_filters.ChoiceFilter(choices=Certification.SPORT_CHOICES)
    issuing_organization = django_filters.CharFilter(lookup_expr='icontains')
    
    # Filter for recent certifications (last 5 years)
    is_recent = django_filters.BooleanFilter(method='filter_recent')
    
    class Meta:
        model = Certification
        fields = {
            'sport': ['exact'],
            'year': ['exact', 'gte', 'lte'],
            'issuing_organization': ['icontains'],
        }
    
    def filter_recent(self, queryset, name, value):
        """Filter for recent certifications (last 5 years)"""
        if value:
            from datetime import datetime
            current_year = datetime.now().year
            return queryset.filter(year__gte=current_year - 4)
        return queryset


class CoachAchievementFilter(django_filters.FilterSet):
    """Custom filter for Coach Achievement model"""
    
    year = django_filters.NumberFilter()
    year__gte = django_filters.NumberFilter(field_name='year', lookup_expr='gte')
    year__lte = django_filters.NumberFilter(field_name='year', lookup_expr='lte')
    category = django_filters.ChoiceFilter(choices=CoachAchievement.CATEGORY_CHOICES)
    
    class Meta:
        model = CoachAchievement
        fields = {
            'category': ['exact'],
            'year': ['exact', 'gte', 'lte'],
        }