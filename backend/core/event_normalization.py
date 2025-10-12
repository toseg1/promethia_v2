"""Utilities for normalizing calendar event payloads into model-friendly data."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, time as time_cls, timedelta
from typing import Any, Dict, List, Optional

from django.utils import timezone
import logging


DurationInput = Optional[str]
DateInput = Optional[str]
TimeInput = Optional[str]


_DURATION_UNIT_MAP = {
    'min': 'minutes',
    'mins': 'minutes',
    'minute': 'minutes',
    'minutes': 'minutes',
    'sec': 'seconds',
    'secs': 'seconds',
    'second': 'seconds',
    'seconds': 'seconds',
    'hr': 'hours',
    'hrs': 'hours',
    'hour': 'hours',
    'hours': 'hours',
}

_DISTANCE_UNIT_MAP = {
    'm': 'meters',
    'meter': 'meters',
    'meters': 'meters',
    'km': 'kilometers',
    'k': 'kilometers',
    'kilometer': 'kilometers',
    'kilometers': 'kilometers',
}

_COLOR_HEX_TO_CHOICE = {
    '#ef4444': 'red',
    '#3b82f6': 'blue',
    '#22c55e': 'green',
    '#eab308': 'yellow',
    '#8b5cf6': 'purple',
    '#f97316': 'orange',
}


def parse_minutes_duration(duration: DurationInput) -> Optional[timedelta]:
    """Convert a duration string or number of minutes into a timedelta."""

    if duration in (None, '', 'null'):
        return None

    if isinstance(duration, str):
        value = duration.strip()
    else:
        value = str(duration)

    if not value:
        return None

    # ISO 8601 duration (PnYnMnDTnHnMnS)
    if value.upper().startswith('P'):
        hours = _extract_first_int(value, 'H')
        minutes = _extract_first_int(value, 'M')
        seconds = _extract_first_int(value, 'S')
        total_seconds = hours * 3600 + minutes * 60 + seconds
        return timedelta(seconds=total_seconds) if total_seconds > 0 else None

    # HH:MM[:SS]
    parts = value.split(':')
    if 2 <= len(parts) <= 3 and all(part.isdigit() for part in parts):
        numbers = [int(part) for part in parts]
        if len(numbers) == 2:
            minutes, seconds = numbers
            hours = 0
        else:
            hours, minutes, seconds = numbers
        total_seconds = hours * 3600 + minutes * 60 + seconds
        return timedelta(seconds=total_seconds) if total_seconds > 0 else None

    # Fallback to treating as minutes (can be float)
    try:
        minutes_value = float(value)
    except (TypeError, ValueError):
        return None

    if minutes_value <= 0:
        return None

    return timedelta(minutes=minutes_value)


def _extract_first_int(value: str, key: str) -> int:
    """Return the first integer preceding the given key in an ISO duration string."""

    try:
        segment = value.split(key)[0]
        digits = ''.join(char for char in segment if char.isdigit())
        return int(digits) if digits else 0
    except (ValueError, AttributeError):
        return 0


def parse_time(value: TimeInput) -> Optional[datetime.time]:
    """Parse a HH:MM or HH:MM:SS time string into a time object."""

    if not value:
        return None

    value = value.strip()
    for fmt in ('%H:%M', '%H:%M:%S'):
        try:
            return datetime.strptime(value, fmt).time()
        except ValueError:
            continue
    return None


def parse_date(value: DateInput) -> Optional[datetime]:
    """Parse a date or ISO datetime string into a datetime."""

    if not value:
        return None

    value = value.strip()

    # ISO datetime
    for fmt in ('%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M', '%Y-%m-%d'):
        try:
            parsed = datetime.strptime(value, fmt)
            if parsed.tzinfo:
                return parsed
            return timezone.make_aware(parsed) if timezone.is_naive(parsed) else parsed
        except ValueError:
            continue

    # Fallback: attempt ISO parsing via fromisoformat
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed)
        return parsed
    except ValueError:
        return None


def combine_date_and_time(date_value: DateInput, time_value: TimeInput) -> Optional[datetime]:
    """Combine a date string and a time string into an aware datetime."""

    parsed_date = parse_date(date_value)
    if not parsed_date:
        return None

    parsed_time = parse_time(time_value)
    if parsed_time:
        combined = datetime.combine(parsed_date.date(), parsed_time)
    else:
        combined = datetime.combine(parsed_date.date(), time_cls(hour=0, minute=0))

    if timezone.is_naive(combined):
        return timezone.make_aware(combined)
    return combined


def map_duration_unit(unit: Optional[str]) -> Optional[str]:
    """Map user-facing duration unit labels to validator-compliant values."""

    if not unit:
        return None
    unit_key = unit.strip().lower()
    return _DURATION_UNIT_MAP.get(unit_key)


def map_distance_unit(unit: Optional[str]) -> Optional[str]:
    """Map user-facing distance unit labels to validator-compliant values."""

    if not unit:
        return None
    unit_key = unit.strip().lower()
    return _DISTANCE_UNIT_MAP.get(unit_key)


def map_intensity_unit(unit: Optional[str]) -> Optional[str]:
    """Map user-facing intensity unit to backend zone_type values."""

    if not unit:
        return None

    # Mapping from frontend intensityUnit to backend zone_type
    intensity_map = {
        'heart_rate': 'HR',
        'hr': 'HR',
        'mas': 'MAS',
        'fpp': 'FPP',
        'css': 'CSS',
    }

    unit_key = unit.strip().lower()
    return intensity_map.get(unit_key, unit)  # Return original if not found


def normalize_training_blocks(blocks: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Convert UI training blocks into backend training_data structure."""

    if not blocks:
        return {}

    training_data: Dict[str, Any] = {}
    intervals: List[Dict[str, Any]] = []
    rest_periods: List[Dict[str, Any]] = []

    for block in blocks:
        block_type = (block.get('type') or '').lower()
        name = block.get('name') or block_type.title() or 'Segment'

        duration_value = block.get('duration') or block.get('distance')
        duration_unit = map_duration_unit(block.get('durationUnit'))

        if block_type in {'warmup', 'cooldown'}:
            numeric_duration = _safe_positive_number(block.get('duration'))
            if not numeric_duration:
                continue
            phase_payload = {
                'name': name,
                'duration': numeric_duration,
                'unit': duration_unit or 'minutes',
            }
            if block_type == 'warmup':
                training_data['warmup'] = phase_payload
            else:
                training_data['cooldown'] = phase_payload
            continue

        if block_type == 'interval':
            # Check if this interval has children/sub-intervals
            children = block.get('children', [])
            has_children = isinstance(children, list) and len(children) > 0

            if has_children:
                # Complex interval with sub-intervals
                sub_intervals = []
                logger.debug(f"🔍 Processing complex interval '{name}' with {len(children)} children")
                for child in children:
                    child_type = (child.get('type') or '').lower()
                    logger.debug(f"  👶 Child: type={child_type}, name={child.get('name')}, intervalType={child.get('intervalType')}")

                    if child_type == 'interval':
                        # Work phase
                        child_interval_type = child.get('intervalType') or 'time'
                        logger.debug(f"    📊 Work phase: intervalType={child_interval_type}")
                        child_duration_value = child.get('duration') if child_interval_type == 'time' else child.get('distance')
                        child_duration_numeric = _safe_positive_number(child_duration_value)
                        logger.debug(f"    📏 Value: {child_duration_value} → {child_duration_numeric}")

                        if child_duration_numeric:
                            child_unit = map_duration_unit(child.get('durationUnit')) if child_interval_type == 'time' else map_distance_unit(child.get('distanceUnit'))
                            work_payload = {
                                'name': child.get('name') or 'Work',
                                'type': child_interval_type,
                                'duration_or_distance': child_duration_numeric,
                                'unit': child_unit or ('minutes' if child_interval_type == 'time' else 'meters'),
                            }

                            # Add intensity if present
                            child_intensity = child.get('intensity')
                            if child_intensity is not None:
                                work_payload['intensity'] = child_intensity
                                child_zone_type = map_intensity_unit(child.get('intensityUnit'))
                                if child_zone_type:
                                    work_payload['zone_type'] = child_zone_type

                            # Find corresponding rest (if next child is rest)
                            sub_interval_entry = {'work': work_payload}
                            sub_intervals.append(sub_interval_entry)

                    elif child_type == 'rest':
                        # Rest phase - attach to previous work if exists
                        child_duration_numeric = _safe_positive_number(child.get('duration'))
                        if child_duration_numeric and sub_intervals:
                            rest_unit = map_duration_unit(child.get('durationUnit')) or 'seconds'
                            rest_payload = {
                                'name': child.get('name') or 'Rest',
                                'duration': child_duration_numeric,
                                'unit': rest_unit,
                            }
                            # Add rest to the last sub-interval
                            sub_intervals[-1]['rest'] = rest_payload

                if sub_intervals:
                    # Create complex interval payload
                    # IMPORTANT: Only name, repetitions, and sub_intervals
                    # NO parent-level type, duration_or_distance, or unit
                    payload = {
                        'name': name,
                        'repetitions': _ensure_positive_int(block.get('repetitions'), default=1),
                        'sub_intervals': sub_intervals,
                    }
                    logger.debug(f"  ✅ Created complex interval payload with keys: {list(payload.keys())}")
                    intervals.append(payload)
                else:
                    logger.warning(f"  ⚠️ No sub_intervals created - skipping interval '{name}'")
            else:
                # Simple interval without children
                interval_type = block.get('intervalType') or 'time'
                interval_unit = duration_unit if interval_type == 'time' else map_distance_unit(block.get('distanceUnit'))
                payload = {
                    'name': name,
                    'type': interval_type,
                    'duration_or_distance': _safe_positive_number(duration_value),
                    'unit': interval_unit or ('minutes' if interval_type == 'time' else 'meters'),
                    'repetitions': _ensure_positive_int(block.get('repetitions'), default=1),
                }

                if payload['duration_or_distance']:
                    intervals.append(payload)
            continue

        if block_type == 'rest':
            numeric_duration = _safe_positive_number(block.get('duration'))
            unit_value = duration_unit or 'minutes'
            if numeric_duration:
                rest_periods.append({
                    'name': name,
                    'duration': numeric_duration,
                    'unit': unit_value,
                })

    if intervals:
        training_data['intervals'] = intervals
    if rest_periods:
        training_data['rest_periods'] = rest_periods

    return training_data


def _safe_positive_number(value: Any) -> Optional[float]:
    """Return a positive float if possible, otherwise None."""

    if value is None or value == '' or value == 'null':
        return None

    try:
        number = float(value)
        return number if number > 0 else None
    except (TypeError, ValueError):
        return None


def _ensure_positive_int(value: Any, default: int = 1) -> int:
    """Return a positive integer, defaulting when absent."""

    try:
        number = int(value)
        return number if number > 0 else default
    except (TypeError, ValueError):
        return default


def map_custom_event_color(color: Optional[str]) -> Optional[str]:
    """Translate hex colour values to the nearest Django model choice."""

    if not color:
        return None

    choice = _COLOR_HEX_TO_CHOICE.get(color.lower())
    return choice


@dataclass
class NormalizedEventPayload:
    """Container for normalized calendar event payloads."""

    event_type: str
    serializer_path: str
    payload: Dict[str, Any]
    athlete_id: Optional[int]


def normalize_event_payload(data: Dict[str, Any]) -> NormalizedEventPayload:
    """Normalize a raw calendar event request into serializer-friendly data."""

    event_type = data.get('type')
    title = data.get('title')

    athlete_raw = data.get('athlete') or data.get('athleteId')
    try:
        athlete_id = int(athlete_raw) if athlete_raw not in (None, '', 'null') else None
    except (TypeError, ValueError):
        athlete_id = None

    if event_type == 'training':
        date_source = data.get('date') or data.get('dateStart')
        datetime_value = combine_date_and_time(date_source, data.get('time'))
        duration_value = parse_minutes_duration(data.get('duration'))
        training_data = normalize_training_blocks(data.get('trainingBlocks'))

        logger.debug(f"\n📦 NORMALIZED training_data:")
        logger.debug(f"  {json.dumps(training_data, indent=2)}")

        description_value = data.get('description') or data.get('notes')

        payload = {
            'title': title or 'Training Session',
            'date': datetime_value,
            'time': parse_time(data.get('time')),
            'duration': duration_value,
            'sport': data.get('sport') or 'other',
            'training_data': training_data or {},
            'notes': (description_value.strip() if isinstance(description_value, str) and description_value.strip() else ''),
        }

        logger.debug(f"\n✅ Created payload with training_data containing {len(training_data.get('intervals', []))} intervals")

        return NormalizedEventPayload(
            event_type='training',
            serializer_path='TrainingSerializer',
            payload=payload,
            athlete_id=athlete_id,
        )

    if event_type == 'race':
        date_source = data.get('dateStart') or data.get('date')
        datetime_value = combine_date_and_time(date_source, data.get('time'))
        location_value = data.get('location')
        description_value = data.get('description')
        distance_value = data.get('distance')

        if isinstance(location_value, str):
            location_value = location_value.strip()
        if isinstance(distance_value, str):
            distance_value = distance_value.strip()
        if isinstance(description_value, str):
            description_value = description_value.strip()

        payload = {
            'title': title or 'Race Event',
            'date': datetime_value,
            'sport': data.get('sport') or 'other',
            'location': location_value or '',
            'distance': distance_value or None,
            'description': description_value or '',
            'target_time': parse_minutes_duration(data.get('timeObjective')),
        }

        return NormalizedEventPayload(
            event_type='race',
            serializer_path='RaceSerializer',
            payload=payload,
            athlete_id=athlete_id,
        )

    if event_type == 'custom':
        start_value = combine_date_and_time(data.get('dateStart') or data.get('date'), None)
        end_value = combine_date_and_time(data.get('dateEnd'), None)

        if end_value is not None and start_value and end_value < start_value:
            end_value = start_value

        payload = {
            'title': title or 'Custom Event',
            'date': start_value,
            'date_end': end_value,
            'location': data.get('location') or '',
            'event_color': map_custom_event_color(data.get('customEventColor')) or 'blue',
            'description': data.get('description') or '',
        }

        return NormalizedEventPayload(
            event_type='custom',
            serializer_path='CustomEventSerializer',
            payload=payload,
            athlete_id=athlete_id,
        )

    raise ValueError('Unsupported event type provided.')
logger = logging.getLogger(__name__)
