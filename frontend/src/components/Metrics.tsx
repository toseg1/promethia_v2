import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsPreset } from '../types';
import { profileService } from '../services/profileService';
import {
  Calculator,
  Target,
  Clock,
  Route,
  Info,
  AlertTriangle,
  RefreshCw,
  Activity,
  Waves,
  Settings,
  Gauge,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mas?: number | string;
  fpp?: number | string;
  css?: number | string;
  cssDisplay?: string;
}

interface MetricsProps {
  user: User;
  onNavigate?: (view: 'profile') => void;
}

type MetricType = 'mas' | 'fpp' | 'css';
type CalculationType = 'distance' | 'time';

interface CalculationResults {
  speed: number; // km/h
  pace: string; // mm:ss format
  distance?: string;
  time?: string;
}

export function Metrics({ user, onNavigate }: MetricsProps) {
  const { t } = useTranslation('metrics');

  // States for metric selection
  const [metricType, setMetricType] = useState<MetricType>('mas');
  const [calculationType, setCalculationType] = useState<CalculationType>('time');
  const [selectedUnit, setSelectedUnit] = useState('m'); // Default to meters (will be updated based on metric type)
  const [isMetricSelectionExpanded, setIsMetricSelectionExpanded] = useState(false); // For mobile collapse
  
  // States for metric values (from profile - fetched from API)
  const [profileMAS, setProfileMAS] = useState<string>(''); // Fetched from profile API
  const [profileFPP, setProfileFPP] = useState<string>(''); // Fetched from profile API  
  const [profileCSS, setProfileCSS] = useState<string>(''); // Fetched from profile API (mm:ss/100m)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  
  // Local calculation metric values (editable for calculations)
  const [calculationMAS, setCalculationMAS] = useState<string>('');
  const [calculationFPP, setCalculationFPP] = useState<string>('');
  const [calculationCSS, setCalculationCSS] = useState<string>(''); // mm:ss/100m format
  
  // Common calculation states - no default percentage
  const [percentage, setPercentage] = useState<string>('');
  const [distance, setDistance] = useState<string>('');
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('0');
  const [seconds, setSeconds] = useState<string>('0');
  const [calculatedResult, setCalculatedResult] = useState<string>('');
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
  const [calculationWarning, setCalculationWarning] = useState<string | null>(null);

  // Helper functions for CSS format conversion
  const convertMmSsToMs = (pace: string): number => {
    const [minutesStr, secondsStr] = pace.split(':');
    const minutes = parseInt(minutesStr) || 0;
    const seconds = parseInt(secondsStr) || 0;
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds <= 0) return 1.0;
    
    // Speed = distance / time = 100m / totalSeconds = m/s
    return 100 / totalSeconds;
  };

  const convertMsToMmSs = (speedMs: number): string => {
    if (speedMs <= 0) return '0:00';
    
    const secondsPer100m = 100 / speedMs;
    const minutes = Math.floor(secondsPer100m / 60);
    const seconds = Math.round(secondsPer100m % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCssSeconds = (totalSeconds: number): string => {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      return '';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const normalizeCssValue = (value: unknown): string => {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'number') {
      return formatCssSeconds(value);
    }

    if (typeof value === 'string') {
      if (value.includes(':')) {
        return value;
      }

      const numeric = Number(value);
      if (!Number.isNaN(numeric) && numeric > 0) {
        return formatCssSeconds(numeric);
      }

      return value;
    }

    return '';
  };

  // New pace calculation functions
  const calculatePaceFromSpeed = (speedKmh: number, metricType: MetricType): string => {
    if (speedKmh <= 0) return '0:00';
    
    let distance: number;
    switch (metricType) {
      case 'mas':
        distance = 1; // 1 km for MAS
        break;
      case 'fpp':
        distance = 5; // 5 km for FPP
        break;
      case 'css':
        distance = 1; // 1 km for CSS (converted from per 100m base)
        break;
      default:
        distance = 1;
    }
    
    const timeInHours = distance / speedKmh;
    const timeInMinutes = timeInHours * 60;
    const minutes = Math.floor(timeInMinutes);
    const seconds = Math.round((timeInMinutes - minutes) * 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const validateCssFormat = (value: string): boolean => {
    const regex = /^\d{1,2}:\d{2}$/;
    if (!regex.test(value)) return false;
    
    const [minutesStr, secondsStr] = value.split(':');
    const minutes = parseInt(minutesStr);
    const seconds = parseInt(secondsStr);
    
    return minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59;
  };


  // Sport-specific time presets
  const timePresets = {
    mas: [
      // Running: Short to medium durations for interval training and runs
      { label: '30s', hours: '0', minutes: '0', seconds: '30' },
      { label: '45s', hours: '0', minutes: '0', seconds: '45' },
      { label: '1min', hours: '0', minutes: '1', seconds: '0' },
      { label: '2mins', hours: '0', minutes: '2', seconds: '0' },
      { label: '5mins', hours: '0', minutes: '5', seconds: '0' },
      { label: '10mins', hours: '0', minutes: '10', seconds: '0' },
      { label: '20mins', hours: '0', minutes: '20', seconds: '0' },
      { label: '30mins', hours: '0', minutes: '30', seconds: '0' },
      { label: '1h', hours: '1', minutes: '0', seconds: '0' }
    ],
    fpp: [
      // Cycling: Medium to long durations for cycling workouts
      { label: '5mins', hours: '0', minutes: '5', seconds: '0' },
      { label: '10mins', hours: '0', minutes: '10', seconds: '0' },
      { label: '15mins', hours: '0', minutes: '15', seconds: '0' },
      { label: '20mins', hours: '0', minutes: '20', seconds: '0' },
      { label: '30mins', hours: '0', minutes: '30', seconds: '0' },
      { label: '45mins', hours: '0', minutes: '45', seconds: '0' },
      { label: '1h', hours: '1', minutes: '0', seconds: '0' },
      { label: '1h 30min', hours: '1', minutes: '30', seconds: '0' },
      { label: '2h', hours: '2', minutes: '0', seconds: '0' }
    ],
    css: [
      // Swimming: Short, intense durations for swimming sets
      { label: '15s', hours: '0', minutes: '0', seconds: '15' },
      { label: '30s', hours: '0', minutes: '0', seconds: '30' },
      { label: '45s', hours: '0', minutes: '0', seconds: '45' },
      { label: '1min', hours: '0', minutes: '1', seconds: '0' },
      { label: '2mins', hours: '0', minutes: '2', seconds: '0' },
      { label: '5mins', hours: '0', minutes: '5', seconds: '0' },
      { label: '10mins', hours: '0', minutes: '10', seconds: '0' },
      { label: '15mins', hours: '0', minutes: '15', seconds: '0' },
      { label: '20mins', hours: '0', minutes: '20', seconds: '0' }
    ]
  };

  // Training intensity percentage presets - 9 presets
  const percentagePresets = [70, 75, 80, 85, 90, 95, 100, 105, 110];

  // Enhanced CSS setter with validation
  const handleCSSChange = (value: string) => {
    // Allow empty values for clearing
    if (value === '') {
      setCalculationCSS(value);
      return;
    }
    
    // Allow intermediate typing states (e.g., "1:", "1:4")
    if (value.includes(':')) {
      const parts = value.split(':');
      if (parts.length === 2) {
        const minutes = parts[0];
        const seconds = parts[1];
        
        // Allow if minutes is valid and seconds is being typed
        if (minutes.match(/^\d{1,2}$/) && (seconds === '' || seconds.match(/^\d{0,2}$/))) {
          setCalculationCSS(value);
          return;
        }
      }
    } else if (value.match(/^\d{1,2}$/)) {
      // Allow just numbers for minutes
      setCalculationCSS(value);
      return;
    }
    
    // For complete format, validate fully
    if (validateCssFormat(value)) {
      setCalculationCSS(value);
    }
  };

  // Metric configurations with enhanced CSS handling
  const metricConfigs = {
    mas: {
      name: t('types.mas.name'),
      fullName: t('types.mas.fullName'),
      unit: t('types.mas.unit'),
      icon: Target,
      color: 'chart-1',
      description: t('types.mas.description'),
      profileValue: profileMAS,
      calculationValue: calculationMAS,
      setCalculationValue: setCalculationMAS,
      range: t('types.mas.range'),
      paceUnit: '/km'
    },
    fpp: {
      name: t('types.fpp.name'),
      fullName: t('types.fpp.fullName'),
      unit: t('types.fpp.unit'),
      icon: Activity,
      color: 'chart-2',
      description: t('types.fpp.description'),
      profileValue: profileFPP,
      calculationValue: calculationFPP,
      setCalculationValue: setCalculationFPP,
      range: t('types.fpp.range'),
      paceUnit: '/5km'
    },
    css: {
      name: t('types.css.name'),
      fullName: t('types.css.fullName'),
      unit: t('types.css.unit'),
      icon: Waves,
      color: 'chart-3',
      description: t('types.css.description'),
      profileValue: profileCSS,
      calculationValue: calculationCSS,
      setCalculationValue: handleCSSChange,
      range: t('types.css.range'),
      paceUnit: '/km'
    }
  };

  const currentConfig = metricConfigs[metricType];
  
  // Enhanced distance presets - 9 distances for each sport, adapted to selected unit
  const getDistancePresets = () => {
    const basePresets = {
      mas: [
        { labelM: '100m', valueM: '100', labelKm: '0.1km', valueKm: '0.1' },
        { labelM: '200m', valueM: '200', labelKm: '0.2km', valueKm: '0.2' },
        { labelM: '500m', valueM: '500', labelKm: '0.5km', valueKm: '0.5' },
        { labelM: '800m', valueM: '800', labelKm: '0.8km', valueKm: '0.8' },
        { labelM: '1000m', valueM: '1000', labelKm: '1km', valueKm: '1' },
        { labelM: '5000m', valueM: '5000', labelKm: '5km', valueKm: '5' },
        { labelM: '10000m', valueM: '10000', labelKm: '10km', valueKm: '10' },
        { labelM: '21100m', valueM: '21100', labelKm: '21.1km', valueKm: '21.1' }, // Half Marathon
        { labelM: '42195m', valueM: '42195', labelKm: '42.2km', valueKm: '42.195' } // Full Marathon
      ],
      fpp: [
        { labelM: '5000m', valueM: '5000', labelKm: '5km', valueKm: '5' },
        { labelM: '10000m', valueM: '10000', labelKm: '10km', valueKm: '10' },
        { labelM: '20000m', valueM: '20000', labelKm: '20km', valueKm: '20' },
        { labelM: '40000m', valueM: '40000', labelKm: '40km', valueKm: '40' },
        { labelM: '60000m', valueM: '60000', labelKm: '60km', valueKm: '60' },
        { labelM: '80000m', valueM: '80000', labelKm: '80km', valueKm: '80' },
        { labelM: '100000m', valueM: '100000', labelKm: '100km', valueKm: '100' },
        { labelM: '120000m', valueM: '120000', labelKm: '120km', valueKm: '120' },
        { labelM: '180000m', valueM: '180000', labelKm: '180km', valueKm: '180' } // Ironman bike distance
      ],
      css: [
        { labelM: '50m', valueM: '50', labelKm: '0.05km', valueKm: '0.05' },
        { labelM: '100m', valueM: '100', labelKm: '0.1km', valueKm: '0.1' },
        { labelM: '200m', valueM: '200', labelKm: '0.2km', valueKm: '0.2' },
        { labelM: '400m', valueM: '400', labelKm: '0.4km', valueKm: '0.4' },
        { labelM: '800m', valueM: '800', labelKm: '0.8km', valueKm: '0.8' },
        { labelM: '1500m', valueM: '1500', labelKm: '1.5km', valueKm: '1.5' },
        { labelM: '3000m', valueM: '3000', labelKm: '3km', valueKm: '3' },
        { labelM: '3800m', valueM: '3800', labelKm: '3.8km', valueKm: '3.8' }, // Ironman swim distance
        { labelM: '5000m', valueM: '5000', labelKm: '5km', valueKm: '5' }
      ]
    };

    const sportPresets = basePresets[metricType];
    return sportPresets.map(preset => ({
      label: selectedUnit === 'm' ? preset.labelM : preset.labelKm,
      value: selectedUnit === 'm' ? preset.valueM : preset.valueKm
    }));
  };

  const distancePresets = getDistancePresets();

  // Show profile metrics immediately if they already exist on the auth user payload
  useEffect(() => {
    const fallbackMas = user?.mas !== undefined && user?.mas !== null ? user.mas.toString() : '';
    const fallbackFpp = user?.fpp !== undefined && user?.fpp !== null ? user.fpp.toString() : '';
    const fallbackCss = normalizeCssValue(user?.cssDisplay ?? user?.css);

    if (fallbackMas) {
      setProfileMAS(prev => prev || fallbackMas);
    }
    if (fallbackFpp) {
      setProfileFPP(prev => prev || fallbackFpp);
    }
    if (fallbackCss) {
      setProfileCSS(prev => prev || fallbackCss);
    }
  }, [user?.mas, user?.fpp, user?.css, user?.cssDisplay]);

  const fetchUserMetrics = useCallback(async () => {
    const fallbackMas = user?.mas;
    const fallbackFpp = user?.fpp;
    const fallbackCss = user?.cssDisplay ?? user?.css;

    try {
      setIsLoadingMetrics(true);
      setMetricsError(null);

      // Load full profile bundle to access normalized user metrics
      const profileBundle = await profileService.getProfile();
      const profileUser = profileBundle?.user;

      const masValue = profileUser?.mas ?? fallbackMas;
      const fppValue = profileUser?.fpp ?? fallbackFpp;
      const cssValue = profileUser?.cssDisplay ?? profileUser?.css ?? fallbackCss;

      const mas = masValue !== undefined && masValue !== null ? masValue.toString() : '';
      const fpp = fppValue !== undefined && fppValue !== null ? fppValue.toString() : '';
      const css = normalizeCssValue(cssValue);

      setProfileMAS(mas);
      setProfileFPP(fpp);
      setProfileCSS(css);

      console.log('Updated metrics from profile bundle:', { mas, fpp, css });
    } catch (error) {
      console.error('Failed to fetch user metrics:', error);
      setMetricsError('Failed to load performance metrics from profile.');
      setProfileMAS(fallbackMas !== undefined && fallbackMas !== null ? fallbackMas.toString() : '');
      setProfileFPP(fallbackFpp !== undefined && fallbackFpp !== null ? fallbackFpp.toString() : '');
      setProfileCSS(normalizeCssValue(fallbackCss));
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [user?.mas, user?.fpp, user?.css, user?.cssDisplay]);

  const handleRefreshMetrics = useCallback(() => {
    if (!isLoadingMetrics) {
      fetchUserMetrics();
    }
  }, [isLoadingMetrics, fetchUserMetrics]);

  // Fetch performance metrics from API on component mount or when user metrics change
  useEffect(() => {
    if (user?.id) {
      fetchUserMetrics();
    }
  }, [user?.id, fetchUserMetrics]);
  
  // Load initial calculation values from profile (with fallbacks for calculations only)
  useEffect(() => {
    setCalculationMAS(profileMAS);
    setCalculationFPP(profileFPP);
    setCalculationCSS(profileCSS);
  }, [profileMAS, profileFPP, profileCSS]);

  // Set initial unit based on default metric type
  useEffect(() => {
    if (metricType === 'fpp') {
      setSelectedUnit('km');
    } else {
      setSelectedUnit('m');
    }
  }, []); // Run only on component mount

  // Calculate results when inputs change
  useEffect(() => {
    calculateResult();
  }, [metricType, calculationMAS, calculationFPP, calculationCSS, percentage, distance, hours, minutes, seconds, calculationType, selectedUnit]);

  const calculateResult = () => {
    setCalculationWarning(null);

    if (!percentage) {
      setCalculatedResult('');
      setCalculationResults(null);
      return;
    }

    const percentageValue = parseFloat(percentage) / 100;
    if (!Number.isFinite(percentageValue) || percentageValue <= 0) {
      setCalculatedResult('');
      setCalculationResults(null);
      setCalculationWarning('Enter a valid percentage to run the calculation.');
      return;
    }

    let effectiveValue = 0;

    // Calculate effective value based on metric type
    if (metricType === 'mas') {
      const currentValue = parseFloat(calculationMAS);
      if (!Number.isFinite(currentValue) || currentValue <= 0) {
        setCalculatedResult('');
        setCalculationResults(null);
        setCalculationWarning('Add a positive MAS value to calculate your training targets.');
        return;
      }
      effectiveValue = currentValue * percentageValue; // km/h
    } else if (metricType === 'fpp') {
      const currentValue = parseFloat(calculationFPP);
      if (!Number.isFinite(currentValue) || currentValue <= 0) {
        setCalculatedResult('');
        setCalculationResults(null);
        setCalculationWarning('Add a positive FPP value to calculate your training targets.');
        return;
      }
      effectiveValue = currentValue * percentageValue; // watts - would need power-to-speed conversion
      // For simplicity, using a rough conversion: 1 watt ≈ 0.05 km/h at 75kg
      effectiveValue = (effectiveValue * 0.05); // Convert to km/h equivalent
    } else if (metricType === 'css') {
      const cssInput = calculationCSS.trim();
      if (!validateCssFormat(cssInput)) {
        setCalculatedResult('');
        setCalculationResults(null);
        if (cssInput) {
          setCalculationWarning('CSS must use the mm:ss format (e.g., 1:45) before results can be calculated.');
        } else {
          setCalculationWarning('Add your CSS in mm:ss per 100m to calculate your swimming targets.');
        }
        return;
      }

      // Convert CSS from mm:ss/100m to m/s, then apply percentage, then convert to km/h
      const speedMs = convertMmSsToMs(cssInput);
      if (!Number.isFinite(speedMs) || speedMs <= 0) {
        setCalculatedResult('');
        setCalculationResults(null);
        setCalculationWarning('CSS value must be greater than 0 to run calculations.');
        return;
      }
      const effectiveSpeedMs = speedMs * percentageValue;
      effectiveValue = effectiveSpeedMs * 3.6; // Convert m/s to km/h
    }

    if (!Number.isFinite(effectiveValue) || effectiveValue <= 0) {
      setCalculatedResult('');
      setCalculationResults(null);
      setCalculationWarning('Unable to calculate results with the current inputs. Double-check your values.');
      return;
    }

    // Calculate pace for the effective speed
    const pace = calculatePaceFromSpeed(effectiveValue, metricType);

    // Always calculate and set performance metrics when percentage is available
    const baseResults: CalculationResults = {
      speed: effectiveValue,
      pace: pace
    };

    if (calculationType === 'time' && distance) {
      // Calculate time from distance - convert to km for calculation
      const distanceValue = parseFloat(distance);
      const distanceKm = selectedUnit === 'm' ? distanceValue / 1000 : distanceValue;
      
      if (distanceKm > 0 && effectiveValue > 0) {
        const timeHours = distanceKm / effectiveValue;
        const totalMinutes = timeHours * 60;
        const resultHours = Math.floor(totalMinutes / 60);
        const resultMinutes = Math.floor(totalMinutes % 60);
        const resultSeconds = Math.round((totalMinutes % 1) * 60);
        
        const timeResult = `${resultHours}h ${resultMinutes}m ${resultSeconds}s`;
        setCalculatedResult(timeResult);
        setCalculationResults({
          ...baseResults,
          time: timeResult,
          distance: `${distanceValue} ${selectedUnit}`
        });
      } else {
        // Set base results even if specific calculation can't be performed
        setCalculatedResult('');
        setCalculationResults(baseResults);
      }
    } else if (calculationType === 'distance') {
      // Calculate distance from time
      const totalTimeHours = parseInt(hours) + parseInt(minutes)/60 + parseInt(seconds)/3600;
      if (totalTimeHours > 0 && effectiveValue > 0) {
        const resultDistanceKm = effectiveValue * totalTimeHours;
        // Convert to selected unit for display
        const resultDistance = selectedUnit === 'm' ? resultDistanceKm * 1000 : resultDistanceKm;
        const distanceResult = `${resultDistance.toFixed(selectedUnit === 'm' ? 0 : 2)} ${selectedUnit}`;
        setCalculatedResult(distanceResult);
        setCalculationResults({
          ...baseResults,
          distance: distanceResult,
          time: `${hours}h ${minutes}m ${seconds}s`
        });
      } else {
        // Set base results even if specific calculation can't be performed
        setCalculatedResult('');
        setCalculationResults(baseResults);
      }
    } else {
      // Always show speed and pace when percentage is set
      setCalculatedResult('');
      setCalculationResults(baseResults);
    }
  };

  const resetCalculator = () => {
    if (calculationType === 'time') {
      setDistance('');
    } else {
      setHours('0');
      setMinutes('0');
      setSeconds('0');
    }
    setCalculatedResult('');
    setCalculationResults(null);
    setCalculationWarning(null);
  };

  // Handler for unit change - convert existing distance value if present
  const handleUnitChange = (newUnit: string) => {
    if (distance && distance !== '') {
      const currentValue = parseFloat(distance);
      if (!isNaN(currentValue)) {
        // Convert between units
        if (selectedUnit === 'm' && newUnit === 'km') {
          // Convert meters to kilometers
          setDistance((currentValue / 1000).toString());
        } else if (selectedUnit === 'km' && newUnit === 'm') {
          // Convert kilometers to meters
          setDistance((currentValue * 1000).toString());
        }
      }
    }
    setSelectedUnit(newUnit);
  };

  const handleCalculationTypeChange = (newType: CalculationType) => {
    setCalculationType(newType);
    setDistance('');
    setHours('0');
    setMinutes('0');
    setSeconds('0');
    setCalculatedResult('');
    setCalculationResults(null);
    setCalculationWarning(null);
  };

  const handleMetricTypeChange = (newMetricType: MetricType) => {
    setMetricType(newMetricType);
    setCalculationType('time');
    setPercentage('');
    setDistance('');
    setHours('0');
    setMinutes('0');
    setSeconds('0');
    setCalculatedResult('');
    setCalculationResults(null);
    setCalculationWarning(null);
    
    // Set appropriate default unit based on metric type
    if (newMetricType === 'fpp') {
      setSelectedUnit('km'); // Cycling typically uses kilometers
    } else {
      setSelectedUnit('m'); // Running and swimming typically use meters
    }
    
    // Auto-collapse on mobile after selection
    setIsMetricSelectionExpanded(false);
  };

  const handleTimePreset = (preset: { hours: string; minutes: string; seconds: string }) => {
    setHours(preset.hours);
    setMinutes(preset.minutes);
    setSeconds(preset.seconds);
  };

  const handleUpdateMetric = () => {
    if (onNavigate) {
      onNavigate('profile');
    }
  };

  const IconComponent = currentConfig.icon;
  const hasProfileValue = Boolean(currentConfig.profileValue);
  const metricPlaceholder = currentConfig.profileValue
? undefined
    : metricType === 'css'
      ? t('calculator.help.enterCss')
      : t('calculator.help.enterMetric', { name: currentConfig.name, unit: currentConfig.unit })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('ui.metricsCalculator')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('ui.subtitle')}
        </p>
      </div>

      {/* Metric Type Selection */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm mb-6">
        {/* Header - different for mobile vs desktop */}
        <div className="mb-4">
          {/* Mobile header with collapse button */}
          <div className="md:hidden flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t('ui.selectMetricType')}</h2>
            <button
              onClick={() => setIsMetricSelectionExpanded(!isMetricSelectionExpanded)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span>{isMetricSelectionExpanded ? 'Collapse' : 'Change'}</span>
              {isMetricSelectionExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          
          {/* Desktop header - simple title */}
          <div className="hidden md:block">
            <h2 className="text-xl font-semibold text-foreground">{t('ui.selectMetricType')}</h2>
          </div>
        </div>

        {/* Mobile collapsed view - show only selected metric */}
        <div className="md:hidden">
          {!isMetricSelectionExpanded && (
            <div className="p-4 rounded-lg border border-primary bg-primary/5 text-primary">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <currentConfig.icon size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{currentConfig.name}</h3>
                  <p className="text-xs text-muted-foreground">{currentConfig.fullName}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile expanded view - show all options */}
          {isMetricSelectionExpanded && (
            <div className="space-y-3">
              {Object.entries(metricConfigs).map(([key, config]) => {
                const IconComp = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleMetricTypeChange(key as MetricType)}
                    className={`w-full p-4 rounded-lg border transition-all duration-200 ${
                      metricType === key
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${metricType === key ? 'bg-primary/10' : 'bg-muted'}`}>
                        <IconComp size={20} className={metricType === key ? 'text-primary' : 'text-muted-foreground'} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{config.name}</h3>
                        <p className="text-xs text-muted-foreground">{config.fullName}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop view - always show grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metricConfigs).map(([key, config]) => {
              const IconComp = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => handleMetricTypeChange(key as MetricType)}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    metricType === key
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border/20 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${metricType === key ? 'bg-primary/10' : 'bg-muted'}`}>
                      <IconComp size={20} className={metricType === key ? 'text-primary' : 'text-muted-foreground'} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">{config.name}</h3>
                      <p className="text-xs text-muted-foreground">{config.fullName}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Metric Display - Read-only from Profile with Update Button */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent size={20} className="text-primary md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('ui.current')} {currentConfig.name}</h2>
              {hasProfileValue ? (
                <>
                  <p className="text-2xl md:text-3xl font-bold text-foregroun">
                    {currentConfig.profileValue} {currentConfig.unit}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {t('ui.add')} {currentConfig.name} {t('ui.profile')}
                  </p>
                  {metricsError && (
                    <p className="text-xs text-destructive">{metricsError}</p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdateMetric}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Settings size={16} />
              <span className="text-sm font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {hasProfileValue ? `Update ${currentConfig.name}` : `Add ${currentConfig.name}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            {currentConfig.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metric Settings */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Settings size={20} className="text-blue-500" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">{currentConfig.name} {t('ui.settings')}</h2>
          </div>

          <div className="space-y-6">
            {/* Metric Input for Calculations - Original styling */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('ui.enter')} {currentConfig.name} ({currentConfig.unit}) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                {metricType === 'css' ? (
                  <input
                    type="text"
                    value={currentConfig.calculationValue}
                    onChange={(e) => currentConfig.setCalculationValue(e.target.value)}
                    placeholder={hasProfileValue ? undefined : 'mm:ss (e.g., 1:45)'}
                    pattern="\d{1,2}:\d{2}"
                    className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                  />
                ) : (
                  <input
                    type="number"
                    step={metricType === 'fpp' ? '1' : '0.1'}
                    value={currentConfig.calculationValue}
                    onChange={(e) => currentConfig.setCalculationValue(e.target.value)}
                    placeholder={metricPlaceholder}
                    className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
  {metricType === 'css'
    ? t(hasProfileValue 
        ? 'calculator.help.cssFromProfile' 
        : 'calculator.help.cssFormat')
    : t(hasProfileValue
        ? 'calculator.help.valueFromProfile'
        : 'calculator.help.enterValue', { range: currentConfig.range })
  }
</p>
            </div>


            {/* Percentage - Original styling */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {currentConfig.name} {t('ui.percentage')} <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="120"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder={t('masCalculator.enterPercentage')}
                  className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('ui.intensity')}
              </p>
              
              {/* Percentage Presets - 9 presets */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground mb-2">
                   {t('ui.presets')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {percentagePresets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setPercentage(preset.toString())}
                      className={`
                        px-2 py-1 rounded-lg border transition-colors text-xs
                        ${percentage === preset.toString()
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200'
                        }
                      `}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distance & Time */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <Route size={20} className="text-chart-1" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('ui.distance_time')}</h2>
          </div>

          <div className="space-y-6">
            {/* Calculation Type Toggle */}
            <div className="space-y-3">
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => handleCalculationTypeChange('time')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                    calculationType === 'time'
                      ? 'bg-white text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock size={16} />
                  <span className="text-sm font-medium">{t('ui.distance')}</span>
                </button>
                <button
                  onClick={() => handleCalculationTypeChange('distance')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                    calculationType === 'distance'
                      ? 'bg-white text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Route size={16} />
                  <span className="text-sm font-medium">{t('ui.time')}</span>
                </button>
              </div>
              
              {/* Mode Description */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
  {t(calculationType === 'time' 
    ? 'calculator.enterDistanceHelp' 
    : 'calculator.enterTimeHelp'
  )}
</p>
              </div>
            </div>

            {/* Distance Input - Only show when calculating time - Original styling */}
            {calculationType === 'time' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Distance <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={selectedUnit === 'm' ? "1" : "0.1"}
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder={t('ui.enterDistanceIn', { unit: selectedUnit === 'm' ? t('ui.meters') : t('ui.kilometers') })}
                      className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                    <select 
                      value={selectedUnit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className="px-3 py-2 border border-border/20 rounded-lg text-sm"
                    >
                      <option value="m">m</option>
                      <option value="km">km</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('ui.cover')} {currentConfig.name} {t('ui.perc')}
                  </p>
                </div>

                {/* Distance Presets */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {t('ui.dpresetsUnit', { unit: selectedUnit === 'm' ? t('ui.meters') : t('ui.kilometers') })}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {distancePresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setDistance(preset.value)}
                        className={`
                          px-2 py-2 rounded-lg border transition-colors text-xs
                          ${distance === preset.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                          }
                        `}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Time Input - Only show when calculating distance */}
            {calculationType === 'distance' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('ui.duration')} <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      />
<label className="block text-xs font-medium text-muted-foreground text-center mt-1">{t('ui.hours')}</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={minutes}
                        onChange={(e) => setMinutes(e.target.value)}
                        className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      />
<label className="block text-xs font-medium text-muted-foreground text-center mt-1">{t('ui.minutes')}</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={seconds}
                        onChange={(e) => setSeconds(e.target.value)}
                        className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      />
<label className="block text-xs font-medium text-muted-foreground text-center mt-1">{t('ui.seconds')}</label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('ui.howLong')} {currentConfig.name} {t('ui.perc')}
                  </p>
                </div>

                {/* Time Presets */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {t('ui.tpresets')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timePresets[metricType].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => handleTimePreset(preset)}
                        className={`
                          px-2 py-2 rounded-lg border transition-colors text-xs
                          ${hours === preset.hours && minutes === preset.minutes && seconds === preset.seconds
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
                          }
                        `}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {calculationWarning && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-700 mt-0.5" />
          <p className="text-sm text-yellow-800">{calculationWarning}</p>
        </div>
      )}

      {/* Results Section */}
      {calculationResults && (
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Calculator size={20} className="text-green-600" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('ui.calculationResults')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Speed */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('calculator.speed')}</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {calculationResults.speed.toFixed(1)} km/h
              </p>
            </div>

            {/* Pace */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('calculator.pace')}</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {calculationResults.pace}{currentConfig.paceUnit}
              </p>
            </div>

            {/* Distance (if calculated) */}
            {calculationResults.distance && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Route size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{t('calculator.distance')}</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {calculationResults.distance}
                </p>
              </div>
            )}

            {/* Time (if calculated) */}
            {calculationResults.time && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{t('calculator.time')}</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {calculationResults.time}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add default export for lazy loading
export default Metrics;
