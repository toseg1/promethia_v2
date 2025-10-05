import React, { memo } from 'react';
import { MetricType, CalculationResults, CalculationType } from './types';

interface MetricCalculationsProps {
  metricType: MetricType;
  calculationType: CalculationType;
  percentage: string;
  distance: string;
  hours: string;
  minutes: string;
  seconds: string;
  selectedUnit: string;
  calculationMAS: string;
  calculationFPP: string;
  calculationCSS: string;
  onResultsChange: (results: CalculationResults, calculatedResult: string) => void;
}

export const MetricCalculations = memo(function MetricCalculations({
  metricType,
  calculationType,
  percentage,
  distance,
  hours,
  minutes,
  seconds,
  selectedUnit,
  calculationMAS,
  calculationFPP,
  calculationCSS,
  onResultsChange
}: MetricCalculationsProps) {
  // Core calculation functions
  const formatPace = (speedKmh: number): string => {
    if (speedKmh <= 0) return '00:00';
    
    const paceSecondsPerKm = 3600 / speedKmh;
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.round(paceSecondsPerKm % 60);
    
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
  };

  const calculateTimeForDistance = (speedKmh: number, distanceKm: number): string => {
    let distance: number;
    
    switch (metricType) {
      case 'mas':
        distance = distanceKm;
        break;
      case 'fpp':
        distance = distanceKm;
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

  // Perform calculations whenever inputs change
  React.useEffect(() => {
    if (!percentage || percentage === '') {
      onResultsChange({ speed: 0, pace: '00:00' }, '');
      return;
    }

    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum <= 0) {
      onResultsChange({ speed: 0, pace: '00:00' }, '');
      return;
    }

    let baseSpeed = 0;
    let currentValue = '';

    // Get current metric value and calculate base speed
    switch (metricType) {
      case 'mas':
        currentValue = calculationMAS;
        const masValue = parseFloat(currentValue);
        if (!isNaN(masValue) && masValue > 0) {
          baseSpeed = masValue;
        }
        break;
      case 'fpp':
        currentValue = calculationFPP;
        const fppValue = parseFloat(currentValue);
        if (!isNaN(fppValue) && fppValue > 0) {
          baseSpeed = fppValue / 1000 * 60; // Convert watts to km/h estimate
        }
        break;
      case 'css':
        currentValue = calculationCSS;
        if (validateCssFormat(currentValue)) {
          const [minutesStr, secondsStr] = currentValue.split(':');
          const totalSeconds = parseInt(minutesStr) * 60 + parseInt(secondsStr);
          if (totalSeconds > 0) {
            // CSS is pace per 100m, convert to km/h
            const pacePerKm = totalSeconds * 10; // 100m to 1km
            baseSpeed = 3600 / pacePerKm; // Convert to km/h
          }
        }
        break;
    }

    if (baseSpeed <= 0) {
      onResultsChange({ speed: 0, pace: '00:00' }, '');
      return;
    }

    // Apply percentage
    const targetSpeed = baseSpeed * (percentageNum / 100);
    const baseResults: CalculationResults = {
      speed: Math.round(targetSpeed * 100) / 100,
      pace: formatPace(targetSpeed)
    };

    // Specific calculations based on type
    if (calculationType === 'time' && distance && distance !== '') {
      const distanceNum = parseFloat(distance);
      if (!isNaN(distanceNum) && distanceNum > 0) {
        const distanceInKm = selectedUnit === 'm' ? distanceNum / 1000 : distanceNum;
        const timeResult = calculateTimeForDistance(targetSpeed, distanceInKm);
        onResultsChange({ ...baseResults, distance: `${distanceNum}${selectedUnit}` }, timeResult);
      } else {
        onResultsChange(baseResults, '');
      }
    } else if (calculationType === 'distance') {
      const hoursNum = parseInt(hours) || 0;
      const minutesNum = parseInt(minutes) || 0;
      const secondsNum = parseInt(seconds) || 0;
      
      if (hoursNum > 0 || minutesNum > 0 || secondsNum > 0) {
        const totalTimeInHours = hoursNum + minutesNum / 60 + secondsNum / 3600;
        const calculatedDistanceKm = targetSpeed * totalTimeInHours;
        const distanceResult = selectedUnit === 'm' 
          ? `${Math.round(calculatedDistanceKm * 1000)}m`
          : `${Math.round(calculatedDistanceKm * 100) / 100}km`;
        
        onResultsChange({
          ...baseResults,
          time: `${hours}h ${minutes}m ${seconds}s`
        }, distanceResult);
      } else {
        onResultsChange(baseResults, '');
      }
    } else {
      onResultsChange(baseResults, '');
    }
  }, [metricType, calculationType, percentage, distance, hours, minutes, seconds, selectedUnit, calculationMAS, calculationFPP, calculationCSS, onResultsChange]);

  return null; // This component handles calculations only
});