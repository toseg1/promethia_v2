from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import (
    User, AthleticProfile, ProfessionalProfile, Achievement, 
    Certification, CoachAchievement, CoachAssignment,
    css_display, css_parse
)


class UserSerializer(serializers.ModelSerializer):
    """
    User serializer for general user data.
    """
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                 'phone_number', 'date_of_birth', 'profile_image', 
                 'is_verified', 'date_joined')
        read_only_fields = ('id', 'date_joined', 'is_verified')




class PasswordChangeSerializer(serializers.Serializer):
    """
    Password change serializer.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("New passwords don't match.")
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class PasswordResetSerializer(serializers.Serializer):
    """
    Password reset serializer.
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('User with this email does not exist.')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Password reset confirmation serializer.
    """
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords don't match."})
        return attrs


# Achievement and Certification Serializers
class AchievementSerializer(serializers.ModelSerializer):
    """Serializer for athlete achievements"""
    
    class Meta:
        model = Achievement
        fields = [
            'id', 'category', 'year', 'title', 'description', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_year(self, value):
        from datetime import datetime
        if value in (None, ''):
            return value

        try:
            year = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError('Achievement year must be a valid number.')

        current_year = datetime.now().year
        if year > current_year:
            raise serializers.ValidationError('Achievement year cannot be in the future.')
        if year < 1900:
            raise serializers.ValidationError('Achievement year must be after 1900.')
        return year


class CertificationSerializer(serializers.ModelSerializer):
    """Serializer for coach certifications"""
    
    is_recent = serializers.ReadOnlyField()
    
    class Meta:
        model = Certification
        fields = [
            'id', 'sport', 'year', 'title', 'issuing_organization',
            'is_recent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_recent', 'created_at', 'updated_at']


class CoachAchievementSerializer(serializers.ModelSerializer):
    """Serializer for coach achievements"""
    
    class Meta:
        model = CoachAchievement
        fields = [
            'id', 'category', 'year', 'title', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# Profile Serializers
class AthleticProfileSerializer(serializers.ModelSerializer):
    """Serializer for athletic profiles with nested achievements"""
    
    achievements = AchievementSerializer(many=True, read_only=True)
    total_achievements = serializers.ReadOnlyField()
    recent_achievements = AchievementSerializer(many=True, read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = AthleticProfile
        fields = [
            'id', 'user', 'user_full_name', 'experience_years', 'about_notes',
            'sports_involved', 'achievements', 'total_achievements', 
            'recent_achievements', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_full_name', 'achievements', 'total_achievements',
            'recent_achievements', 'created_at', 'updated_at'
        ]


class ProfessionalProfileSerializer(serializers.ModelSerializer):
    """Serializer for professional profiles with nested certifications and achievements"""
    
    certifications = CertificationSerializer(many=True, read_only=True)
    coach_achievements = CoachAchievementSerializer(many=True, read_only=True)
    total_certifications = serializers.ReadOnlyField()
    total_achievements = serializers.ReadOnlyField()
    active_certifications = CertificationSerializer(many=True, read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ProfessionalProfile
        fields = [
            'id', 'user', 'user_full_name', 'experience_years', 'about_notes',
            'certifications', 'coach_achievements', 'total_certifications',
            'total_achievements', 'active_certifications', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_full_name', 'certifications', 'coach_achievements',
            'total_certifications', 'total_achievements', 'active_certifications',
            'created_at', 'updated_at'
        ]


class ProfileCreateSerializer(serializers.Serializer):
    """Serializer for creating profiles based on user type"""
    
    experience_years = serializers.IntegerField(required=False, allow_null=True)
    about_notes = serializers.CharField(required=False, allow_blank=True)
    sports_involved = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )
    
    def validate_sports_involved(self, value):
        if value:
            valid_sports = ['running', 'cycling', 'swimming', 'triathlon', 'strength']
            for sport in value:
                if sport not in valid_sports:
                    raise serializers.ValidationError(f'Invalid sport: {sport}')
        return value


# Coach Assignment Serializers
class CoachAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for coach-athlete assignments"""
    
    mentee_name = serializers.CharField(source='mentee.get_full_name', read_only=True)
    coach_name = serializers.CharField(source='coach.get_full_name', read_only=True)
    mentee_email = serializers.EmailField(source='mentee.email', read_only=True)
    coach_email = serializers.EmailField(source='coach.email', read_only=True)
    
    class Meta:
        model = CoachAssignment
        fields = [
            'id', 'mentee', 'coach', 'mentee_name', 'coach_name',
            'mentee_email', 'coach_email', 'start_date', 'end_date',
            'is_active', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'mentee_name', 'coach_name', 'mentee_email', 'coach_email',
            'start_date', 'created_at', 'updated_at'
        ]


# Enhanced User Serializers
class UserRegistrationSerializer(serializers.ModelSerializer):
    """Enhanced user registration serializer with all required fields"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    css_time = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'user_type', 'country_number',
            'phone_number', 'date_of_birth', 'mas', 'fpp', 'css_time'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def validate_phone_number(self, value):
        """Validate that phone_number contains only local number"""
        if value and value.startswith('+'):
            raise serializers.ValidationError(
                'Phone number should not include country code. Use country_number field for country code.'
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        
        # Handle CSS time format conversion
        css_time = attrs.pop('css_time', None)
        if css_time:
            try:
                attrs['css'] = css_parse(css_time)
            except ValidationError as e:
                raise serializers.ValidationError({'css_time': str(e)})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        try:
            user = User.objects.create_user(**validated_data)
            return user
        except ValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            if hasattr(e, 'message_dict'):
                raise serializers.ValidationError(e.message_dict)
            else:
                raise serializers.ValidationError({'non_field_errors': [str(e)]})


class UserLoginSerializer(serializers.Serializer):
    """User login serializer supporting username or email"""
    
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username_or_email = attrs.get('username_or_email')
        password = attrs.get('password')

        if username_or_email and password:
            # Try email first, then username
            user = None
            if '@' in username_or_email:
                user = authenticate(username=username_or_email, password=password)
            else:
                try:
                    user_obj = User.objects.get(username=username_or_email)
                    user = authenticate(username=user_obj.email, password=password)
                except User.DoesNotExist:
                    pass
                    
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username/email and password.')

        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Full user profile with related data"""
    
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    full_phone_number = serializers.ReadOnlyField()
    css_display = serializers.ReadOnlyField()
    athletic_profile = AthleticProfileSerializer(read_only=True)
    professional_profile = ProfessionalProfileSerializer(read_only=True)
    coaching_summary = serializers.SerializerMethodField()
    css_time = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'user_type', 'country_number', 'phone_number', 'full_phone_number',
            'date_of_birth', 'age', 'profile_image', 'coach_id', 'mas', 'fpp',
            'css', 'css_display', 'css_time', 'is_verified', 'created_at',
            'updated_at', 'athletic_profile', 'professional_profile', 'coaching_summary'
        ]
        read_only_fields = [
            'id', 'username', 'coach_id', 'full_name', 'age', 'full_phone_number',
            'css_display', 'is_verified', 'created_at', 'updated_at',
            'athletic_profile', 'professional_profile', 'coaching_summary'
        ]

    def get_coaching_summary(self, obj):
        return obj.get_coaching_summary()

    def update(self, instance, validated_data):
        # Handle CSS time format conversion
        css_time = validated_data.pop('css_time', None)
        if css_time:
            try:
                validated_data['css'] = css_parse(css_time)
            except ValidationError as e:
                raise serializers.ValidationError({'css_time': str(e)})
        
        return super().update(instance, validated_data)


class UserListSerializer(serializers.ModelSerializer):
    """Minimal user data for lists"""
    
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'full_name', 'user_type', 'profile_image', 'coach_id'
        ]


class AchievementSummarySerializer(serializers.ModelSerializer):
    """Lean achievement representation for athlete summaries"""

    class Meta:
        model = Achievement
        fields = ['id', 'title', 'category', 'year']


class AthleticProfileSummarySerializer(serializers.ModelSerializer):
    """Compact athletic profile details with achievements"""

    achievements = AchievementSummarySerializer(many=True, read_only=True)

    class Meta:
        model = AthleticProfile
        fields = [
            'id', 'experience_years', 'about_notes', 'sports_involved',
            'achievements'
        ]


class CoachAthleteListSerializer(serializers.ModelSerializer):
    """Detailed athlete data for coach dashboards"""

    full_name = serializers.ReadOnlyField()
    css_display = serializers.ReadOnlyField()
    athletic_profile = AthleticProfileSummarySerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'user_type', 'profile_image', 'coach_id',
            'country_number', 'phone_number',
            'date_joined', 'created_at',
            'mas', 'fpp', 'css', 'css_display',
            'athletic_profile'
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    """User update serializer excluding sensitive fields"""
    
    css_time = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'country_number', 'phone_number',
            'date_of_birth', 'profile_image', 'mas', 'fpp', 'css', 'css_time'
        ]

    def validate_phone_number(self, value):
        """Validate that phone_number contains only local number"""
        if value and value.startswith('+'):
            raise serializers.ValidationError(
                'Phone number should not include country code. Use country_number field for country code.'
            )
        return value

    def update(self, instance, validated_data):
        # Handle CSS time format conversion
        css_time = validated_data.pop('css_time', None)
        css_direct = validated_data.get('css')
        
        # If both css and css_time are provided, css_time takes precedence
        # This allows users to input friendly time format over raw seconds
        if css_time:
            try:
                validated_data['css'] = css_parse(css_time)
            except ValidationError as e:
                raise serializers.ValidationError({'css_time': str(e)})
        elif css_time == '':  # Empty string means clear CSS
            validated_data['css'] = None
        # If only css_direct is provided, it will be used as-is
        
        return super().update(instance, validated_data)


class CoachAccessSerializer(serializers.Serializer):
    """Serializer for adding coach access via coach_id"""
    
    coach_id = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_coach_id(self, value):
        cleaned_value = value.strip().upper()
        try:
            User.objects.get(coach_id=cleaned_value)
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with this coach_id.')
        return cleaned_value


class CoachAccessRemovalSerializer(serializers.Serializer):
    """Serializer for removing a coach-athlete relationship"""

    athlete_id = serializers.CharField(required=False, allow_blank=True)
    coach_id = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        athlete_id = (attrs.get('athlete_id') or '').strip()
        coach_id = (attrs.get('coach_id') or '').strip()

        if not athlete_id and not coach_id:
            raise serializers.ValidationError('Athlete or coach identifier is required.')

        attrs['athlete_id'] = athlete_id or None
        attrs['coach_id'] = coach_id or None
        return attrs
