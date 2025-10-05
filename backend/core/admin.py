from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
import json
from .events import Training, Race, CustomEvent, SavedTraining


@admin.register(Training)
class TrainingAdmin(admin.ModelAdmin):
    list_display = ('title', 'get_athlete_name', 'sport', 'date', 'duration', 'get_workout_summary')
    list_filter = ('sport', 'date', 'created_at')
    search_fields = ('title', 'athlete__first_name', 'athlete__last_name', 'athlete__email')
    ordering = ('-date',)
    date_hierarchy = 'date'
    
    fieldsets = (
        (None, {
            'fields': ('title', 'athlete', 'sport', 'date', 'time')
        }),
        ('Training Details', {
            'fields': ('duration', 'notes')
        }),
        ('Workout Structure', {
            'fields': ('training_data',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_athlete_name(self, obj):
        return obj.athlete.get_full_name()
    get_athlete_name.short_description = 'Athlete'
    get_athlete_name.admin_order_field = 'athlete__first_name'

    def get_workout_summary(self, obj):
        return obj.workout_summary
    get_workout_summary.short_description = 'Workout Summary'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('athlete')

    class Media:
        css = {
            'all': ('admin/css/forms.css',)
        }
        js = ('admin/js/training_data.js',)


@admin.register(Race)
class RaceAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'get_athlete_name', 'sport', 'location', 
        'distance', 'date', 'is_completed', 'get_pace', 'get_target_comparison'
    )
    list_filter = ('sport', 'date', 'created_at')
    search_fields = ('title', 'location', 'description', 'athlete__first_name', 'athlete__last_name', 'athlete__email')
    ordering = ('-date',)
    date_hierarchy = 'date'
    
    fieldsets = (
        (None, {
            'fields': ('title', 'athlete', 'sport', 'date')
        }),
        ('Race Details', {
            'fields': ('location', 'distance', 'description')
        }),
        ('Performance', {
            'fields': ('target_time', 'finish_time'),
            'description': 'Target time is optional. Finish time is filled after race completion.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_athlete_name(self, obj):
        return obj.athlete.get_full_name()
    get_athlete_name.short_description = 'Athlete'
    get_athlete_name.admin_order_field = 'athlete__first_name'

    def is_completed(self, obj):
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if obj.is_completed else 'orange',
            'Completed' if obj.is_completed else 'Upcoming'
        )
    is_completed.short_description = 'Status'

    def get_pace(self, obj):
        return obj.pace_per_km or 'N/A'
    get_pace.short_description = 'Pace per km'

    def get_target_comparison(self, obj):
        return obj.target_vs_actual or 'N/A'
    get_target_comparison.short_description = 'vs Target'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('athlete')


@admin.register(CustomEvent)
class CustomEventAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'get_athlete_name', 'date', 'date_end', 
        'duration_days', 'location', 'get_color_display'
    )
    list_filter = ('event_color', 'date', 'created_at')
    search_fields = ('title', 'location', 'athlete__first_name', 'athlete__last_name', 'athlete__email')
    ordering = ('-date',)
    date_hierarchy = 'date'
    
    fieldsets = (
        (None, {
            'fields': ('title', 'athlete', 'date', 'date_end')
        }),
        ('Event Details', {
            'fields': ('location', 'event_color', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_athlete_name(self, obj):
        return obj.athlete.get_full_name()
    get_athlete_name.short_description = 'Athlete'
    get_athlete_name.admin_order_field = 'athlete__first_name'

    def get_color_display(self, obj):
        color_map = {
            'red': '#ff0000',
            'blue': '#0000ff',
            'green': '#008000',
            'yellow': '#ffff00',
            'purple': '#800080',
            'orange': '#ffa500',
        }
        
        color_code = color_map.get(obj.event_color, '#000000')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color_code,
            obj.get_event_color_display()
        )
    get_color_display.short_description = 'Color'

    def duration_days(self, obj):
        return obj.duration_days
    duration_days.short_description = 'Duration (days)'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('athlete')


@admin.register(SavedTraining)
class SavedTrainingAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_creator_name', 'sport', 'is_public', 'created_at')
    list_filter = ('sport', 'is_public', 'created_at')
    search_fields = ('name', 'description', 'creator__first_name', 'creator__last_name', 'creator__email')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        (None, {
            'fields': ('name', 'creator', 'sport', 'description')
        }),
        ('Training Structure', {
            'fields': ('training_data',),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('is_public',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ('created_at', 'updated_at')

    def get_creator_name(self, obj):
        return obj.creator.get_full_name()
    get_creator_name.short_description = 'Creator'
    get_creator_name.admin_order_field = 'creator__first_name'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('creator')


# Add custom CSS for better admin interface
class AdminSite(admin.AdminSite):
    site_header = 'Sports Training Administration'
    site_title = 'Sports Training Admin'
    index_title = 'Sports Training Management'
