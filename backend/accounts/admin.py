from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import (
    User, AthleticProfile, ProfessionalProfile, 
    Achievement, Certification, CoachAchievement, CoachAssignment
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'email', 'username', 'first_name', 'last_name', 
        'user_type', 'coach_display_id', 
        'is_verified', 'is_staff', 'date_joined'
    )
    list_filter = (
        'user_type', 'is_staff', 'is_superuser', 'is_active', 
        'is_verified', 'date_joined'
    )
    search_fields = ('email', 'username', 'first_name', 'last_name', 'phone_number')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions')

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Contact Information', {
            'fields': ('country_number', 'phone_number')
        }),
        ('User Profile', {
            'fields': ('user_type', 'date_of_birth', 'profile_image')
        }),
        ('Coach System', {
            'fields': ('coach_id',),
            'description': 'Unique coach ID for sharing with others to create connections'
        }),
        ('Performance Metrics', {
            'fields': ('mas', 'fpp', 'css'),
            'description': 'Performance metrics (available for both athletes and coaches)'
        }),
        ('Account Status', {
            'fields': ('is_verified', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_queryset(self, request):
        return super().get_queryset(request)

    def coach_display_id(self, obj):
        return obj.coach_id
    coach_display_id.short_description = 'Coach ID'

    # assigned_coach_display removed - use CoachAssignment model instead


class AchievementInline(admin.TabularInline):
    model = Achievement
    extra = 0
    fields = ('category', 'year', 'title', 'description')
    ordering = ('-year',)


@admin.register(AthleticProfile)
class AthleticProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_sports_display', 'experience_years', 'total_achievements', 'created_at')
    list_filter = ('experience_years', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    ordering = ('-created_at',)
    inlines = [AchievementInline]
    
    fieldsets = (
        (None, {
            'fields': ('user', 'sports_involved', 'experience_years')
        }),
        ('Additional Information', {
            'fields': ('about_notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_sports_display(self, obj):
        if obj.sports_involved:
            return ', '.join(obj.sports_involved)
        return 'Not specified'
    get_sports_display.short_description = 'Sports'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


class CertificationInline(admin.TabularInline):
    model = Certification
    extra = 0
    fields = ('sport', 'year', 'title', 'issuing_organization')
    ordering = ('-year',)


class CoachAchievementInline(admin.TabularInline):
    model = CoachAchievement
    extra = 0
    fields = ('category', 'year', 'title', 'description')
    ordering = ('-year',)


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'experience_years', 'total_certifications', 'total_achievements', 'created_at')
    list_filter = ('experience_years', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    ordering = ('-created_at',)
    inlines = [CertificationInline, CoachAchievementInline]
    
    fieldsets = (
        (None, {
            'fields': ('user', 'experience_years')
        }),
        ('Professional Background', {
            'fields': ('about_notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('title', 'get_athlete_name', 'category', 'year', 'created_at')
    list_filter = ('category', 'year', 'created_at')
    search_fields = ('title', 'profile__user__first_name', 'profile__user__last_name')
    ordering = ('-year', '-created_at')
    
    fieldsets = (
        (None, {
            'fields': ('profile', 'category', 'year', 'title')
        }),
        ('Details', {
            'fields': ('description',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_athlete_name(self, obj):
        return obj.profile.user.get_full_name()
    get_athlete_name.short_description = 'Athlete'
    get_athlete_name.admin_order_field = 'profile__user__first_name'

    # Sports display removed - sports are now in AthleticProfile

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile__user')


@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'get_coach_name', 'sport', 'issuing_organization', 'year', 'is_recent')
    list_filter = ('sport', 'year', 'issuing_organization', 'created_at')
    search_fields = ('title', 'profile__user__first_name', 'profile__user__last_name', 'issuing_organization')
    ordering = ('-year', '-created_at')
    
    fieldsets = (
        (None, {
            'fields': ('profile', 'sport', 'year', 'title')
        }),
        ('Certification Details', {
            'fields': ('issuing_organization',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_coach_name(self, obj):
        return obj.profile.user.get_full_name()
    get_coach_name.short_description = 'Coach'
    get_coach_name.admin_order_field = 'profile__user__first_name'

    def is_recent(self, obj):
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if obj.is_recent else 'red',
            'Recent' if obj.is_recent else 'Old'
        )
    is_recent.short_description = 'Recent'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile__user')


@admin.register(CoachAchievement)
class CoachAchievementAdmin(admin.ModelAdmin):
    list_display = ('title', 'get_coach_name', 'category', 'year', 'created_at')
    list_filter = ('category', 'year', 'created_at')
    search_fields = ('title', 'profile__user__first_name', 'profile__user__last_name')
    ordering = ('-year', '-created_at')
    
    fieldsets = (
        (None, {
            'fields': ('profile', 'category', 'year', 'title')
        }),
        ('Details', {
            'fields': ('description',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

    def get_coach_name(self, obj):
        return obj.profile.user.get_full_name()
    get_coach_name.short_description = 'Coach'
    get_coach_name.admin_order_field = 'profile__user__first_name'

    # Sports display removed - sports are now in AthleticProfile

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile__user')


@admin.register(CoachAssignment)
class CoachAssignmentAdmin(admin.ModelAdmin):
    list_display = ("get_coach_name", "get_mentee_name", "is_active", "start_date", "end_date")
    list_filter = ("is_active", "start_date", "coach__user_type", "mentee__user_type")
    search_fields = ("coach__first_name", "coach__last_name", "mentee__first_name", "mentee__last_name", "notes")
    ordering = ("-created_at",)
    date_hierarchy = "start_date"
    
    fieldsets = (
        (None, {
            "fields": ("coach", "mentee"),
            "description": "Coach gets access to Mentee's calendar data"
        }),
        ("Timeline", {
            "fields": ("start_date", "end_date", "is_active")
        }),
        ("Additional Info", {
            "fields": ("notes",),
            "classes": ("collapse",)
        }),
        ("System Info", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    readonly_fields = ("start_date", "created_at", "updated_at")

    def get_coach_name(self, obj):
        return f"{obj.coach.get_full_name()} ({obj.coach.user_type})"
    get_coach_name.short_description = "Coach/Mentor"
    get_coach_name.admin_order_field = "coach__first_name"

    def get_mentee_name(self, obj):
        return f"{obj.mentee.get_full_name()} ({obj.mentee.user_type})"
    get_mentee_name.short_description = "Mentee"
    get_mentee_name.admin_order_field = "mentee__first_name"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("coach", "mentee")
