import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Target,
  Clock,
  Route,
  Info,
  RefreshCw,
  User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface MASCalculatorProps {
  user: User;
}

export function MASCalculator({ user }: MASCalculatorProps) {
  const { t } = useTranslation('metrics');

  // States for MAS calculation
  const [currentMAS, setCurrentMAS] = useState<string>('17.0'); // Default from profile
  const [masPercentage, setMasPercentage] = useState<string>('85');
  const [distance, setDistance] = useState<string>('');
  const [hours, setHours] = useState<string>('0');
  const [minutes, setMinutes] = useState<string>('25');
  const [seconds, setSeconds] = useState<string>('30');
  const [calculatedResult, setCalculatedResult] = useState<string>('');
  const [calculationType, setCalculationType] = useState<'distance' | 'time'>('time');

  // Quick MAS presets
  const masPresets = [14, 15, 16, 17, 18, 19, 20, 21, 22];
  
  // Common distances
  const distancePresets = [
    { label: '100m', value: '0.1' },
    { label: '200m', value: '0.2' },
    { label: '300m', value: '0.3' },
    { label: '500m', value: '0.5' },
    { label: '800m', value: '0.8' },
    { label: '1km', value: '1' },
    { label: '2km', value: '2' }
  ];

  // Load MAS from profile (mock data - in real app would come from backend)
  useEffect(() => {
    // Mock profile MAS value
    const profileMAS = '18.5'; // This would come from user profile
    if (profileMAS) {
      setCurrentMAS(profileMAS);
    }
  }, []);

  // Calculate results when inputs change
  useEffect(() => {
    calculateResult();
  }, [currentMAS, masPercentage, distance, hours, minutes, seconds, calculationType]);

  const calculateResult = () => {
    const mas = parseFloat(currentMAS);
    const percentage = parseFloat(masPercentage) / 100;
    const effectiveSpeed = mas * percentage; // km/h

    if (calculationType === 'time' && distance) {
      // Calculate time from distance
      const distanceKm = parseFloat(distance);
      if (distanceKm > 0 && effectiveSpeed > 0) {
        const timeHours = distanceKm / effectiveSpeed;
        const totalMinutes = timeHours * 60;
        const resultHours = Math.floor(totalMinutes / 60);
        const resultMinutes = Math.floor(totalMinutes % 60);
        const resultSeconds = Math.round((totalMinutes % 1) * 60);
        
        setCalculatedResult(`${resultHours}h ${resultMinutes}m ${resultSeconds}s`);
      }
    } else if (calculationType === 'distance') {
      // Calculate distance from time
      const totalTimeHours = parseInt(hours) + parseInt(minutes)/60 + parseInt(seconds)/3600;
      if (totalTimeHours > 0 && effectiveSpeed > 0) {
        const resultDistance = effectiveSpeed * totalTimeHours;
        setCalculatedResult(`${resultDistance.toFixed(2)} km`);
      }
    }
  };

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.round((totalMinutes % 1) * 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const resetCalculator = () => {
    if (calculationType === 'time') {
      setDistance('');
    } else {
      setHours('0');
      setMinutes('25');
      setSeconds('30');
    }
    setCalculatedResult('');
  };

  const handleCalculationTypeChange = (newType: 'distance' | 'time') => {
    setCalculationType(newType);
    // Clear inputs when switching modes
    setDistance('');
    setHours('0');
    setMinutes('25');
    setSeconds('30');
    setCalculatedResult('');
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">MAS Calculator</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Calculate running times, speeds, and distances based on VMA (Maximal Aerobic Speed)
        </p>
      </div>

      {/* Current MAS Display */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User size={20} className="text-primary md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('masCalculator.yourCurrentMAS')}</h2>
              <p className="text-2xl md:text-3xl font-bold text-primary">{currentMAS} km/h</p>
              <p className="text-xs md:text-sm text-muted-foreground">Updated from Profile</p>
            </div>
          </div>
          <button
            onClick={() => {/* Would update MAS in profile */}}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            Update MAS
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Calculate running times, speeds, and distances based on VMA (Maximal Aerobic Speed)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAS Settings */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Target size={20} className="text-primary" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">MAS Settings</h2>
          </div>

          <div className="space-y-6">
            {/* MAS Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                MAS (km/h) <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={currentMAS}
                  onChange={(e) => setCurrentMAS(e.target.value)}
                  placeholder={t('masCalculator.enterVMA')}
                  className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Typical range: 12-22 km/h for recreational runners
              </p>
            </div>

            {/* Quick MAS Presets */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Quick MAS Presets:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {masPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCurrentMAS(preset.toString())}
                    className={`
                      px-3 py-2 rounded-lg border transition-colors text-sm
                      ${currentMAS === preset.toString()
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-foreground border-border/20 hover:bg-muted/50'
                      }
                    `}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* MAS Percentage */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                MAS Percentage (%) <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="120"
                  value={masPercentage}
                  onChange={(e) => setMasPercentage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Training intensity (70-105% typical)
              </p>
            </div>
          </div>
        </div>

        {/* Distance & Time */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 bg-chart-1/10 rounded-lg">
              <Route size={20} className="text-chart-1" />
            </div>
            <h2 className="text-lg md:text-xl font-semibold text-foreground">Distance & Time</h2>
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
                  <span className="text-sm font-medium">{t('masCalculator.calculateTime')}</span>
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
                  <span className="text-sm font-medium">{t('masCalculator.calculateDistance')}</span>
                </button>
              </div>
              
              {/* Mode Description */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  {calculationType === 'time' 
                    ? "Enter a distance to calculate how long it will take to complete at your target MAS percentage."
                    : "Enter a time duration to calculate how far you can go at your target MAS percentage."
                  }
                </p>
              </div>
            </div>

            {/* Distance Input - Only show when calculating time */}
            {calculationType === 'time' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Distance <span className="text-destructive">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                      placeholder={t('masCalculator.enterDistance')}
                      className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                    <select className="px-3 py-2 border border-border/20 rounded-lg text-sm">
                      <option value="km">km</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the distance you want to run
                  </p>
                </div>

                {/* Common Distances */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Quick Distance Presets:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {distancePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setDistance(preset.value)}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          distance === preset.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Target Time - Only show when calculating distance */}
            {calculationType === 'distance' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Target Time <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">Hours</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      placeholder="25"
                      required
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">Minutes</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">Seconds</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the time you want to exercise for
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {calculatedResult && (
        <div className="mt-6 bg-green-50 border border-green-200 p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                {calculationType === 'time' ? <Clock size={20} className="text-green-600" /> : <Route size={20} className="text-green-600" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  {calculationType === 'time' ? 'Time Required' : 'Distance Achievable'}
                </h3>
                <p className="text-2xl font-bold text-green-600">{calculatedResult}</p>
                <p className="text-sm text-green-700">
                  At {masPercentage}% of MAS ({(parseFloat(currentMAS) * parseFloat(masPercentage) / 100).toFixed(1)} km/h)
                </p>
                {calculationType === 'time' && distance && (
                  <p className="text-xs text-green-600 mt-1">
                    For {distance} km distance
                  </p>
                )}
                {calculationType === 'distance' && (hours !== '0' || minutes !== '0' || seconds !== '0') && (
                  <p className="text-xs text-green-600 mt-1">
                    For {hours}h {minutes}m {seconds}s duration
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={resetCalculator}
              className="flex items-center gap-2 px-3 py-2 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
            >
              <RefreshCw size={16} />
              <span className="text-sm">Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Training Zones */}
      <div className="mt-6 bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('masCalculator.trainingZones')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-800">Zone 1 (60-70%)</span>
              <span className="text-green-600">
                {(parseFloat(currentMAS) * 0.6).toFixed(1)} - {(parseFloat(currentMAS) * 0.7).toFixed(1)} km/h
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="font-medium text-yellow-800">Zone 2 (70-80%)</span>
              <span className="text-yellow-600">
                {(parseFloat(currentMAS) * 0.7).toFixed(1)} - {(parseFloat(currentMAS) * 0.8).toFixed(1)} km/h
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="font-medium text-orange-800">Zone 3 (80-90%)</span>
              <span className="text-orange-600">
                {(parseFloat(currentMAS) * 0.8).toFixed(1)} - {(parseFloat(currentMAS) * 0.9).toFixed(1)} km/h
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-red-800">Zone 4 (90-100%)</span>
              <span className="text-red-600">
                {(parseFloat(currentMAS) * 0.9).toFixed(1)} - {parseFloat(currentMAS)} km/h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}