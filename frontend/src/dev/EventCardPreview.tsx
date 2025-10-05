import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { RaceEventCard } from '../components/RaceEventCard';
import { TrainingEventCard } from '../components/TrainingEventCard';

// Infer the event prop types directly from the card components
type RaceEvent = React.ComponentProps<typeof RaceEventCard>['event'];
type TrainingEvent = React.ComponentProps<typeof TrainingEventCard>['event'];

const sampleTrainingBlocks: NonNullable<TrainingEvent['trainingBlocks']> = [
  {
    id: 'warmup-1',
    type: 'warmup',
    name: 'Warm Up',
    duration: '20',
    durationUnit: 'min',
    intensity: 70,
    intensityUnit: 'heart_rate',
    notes: 'Light jog and drills.'
  },
  {
    id: 'interval-set',
    type: 'interval',
    name: 'Interval Set',
    repetitions: 5,
    notes: 'Focus on even pacing.',
    children: [
      {
        id: 'interval-1',
        type: 'run',
        name: 'Rep 1',
        duration: '4',
        durationUnit: 'min',
        intensity: 95,
        intensityUnit: 'MAS',
        repetitions: 2
      },
      {
        id: 'recovery-1',
        type: 'recovery',
        name: 'Recovery',
        duration: '90',
        durationUnit: 'sec',
        intensity: 60,
        intensityUnit: 'heart_rate'
      }
    ]
  },
  {
    id: 'recovery-block',
    type: 'recovery',
    name: 'Recovery Jog',
    duration: '90',
    durationUnit: 'sec'
  },
  {
    id: 'cooldown-block',
    type: 'cooldown',
    name: 'Cool Down',
    duration: '10',
    durationUnit: 'min',
    intensity: 65,
    intensityUnit: 'heart_rate'
  }
];

const sampleRaceEvent: RaceEvent & { trainingBlocks: typeof sampleTrainingBlocks } = {
  id: 'race-1',
  title: '5K Intervals',
  type: 'race',
  date: new Date('2025-10-09T08:00:00'),
  dateStart: '2025-10-09',
  dateEnd: '2025-10-09',
  startTime: '08:00',
  endTime: '09:00',
  location: 'Central Park, NYC',
  description: 'Tune-up session ahead of the key race.',
  raceDistance: '5K',
  distance: '5 km',
  raceCategory: 'Running',
  startWave: 'Wave B',
  bibNumber: '1234',
  goalTime: '00:20:30',
  timeObjective: '00:20:00',
  pacePlan: '4:00 / km',
  estimatedFinish: '09:00',
  coach: 'Coach Taylor',
  registrationStatus: 'registered',
  sport: 'running',
  athlete: 'Theo Seguin',
  duration: '51min',
  notes: 'Keep cadence high during the middle reps.',
  trainingBlocks: sampleTrainingBlocks
};

const sampleTrainingEvent: TrainingEvent = {
  id: 'training-1',
  title: '5K Interval Session',
  type: 'training',
  date: new Date('2025-10-07T08:00:00'),
  startTime: '08:00',
  endTime: '09:00',
  duration: 60,
  location: 'Indoor Track',
  description: 'Race simulation workout focusing on even pacing.',
  trainingBlocks: sampleTrainingBlocks,
  coach: 'Coach Taylor',
  notes: 'Remember to stay relaxed during recovery jogs.',
  sport: 'running',
  athlete: 'Theo Seguin',
  trainingName: '5K Sharpening'
};

export function EventCardPreview() {
  const [locale, setLocale] = React.useState<'en' | 'fr'>(i18n.language.startsWith('fr') ? 'fr' : 'en');
  const [activeCard, setActiveCard] = React.useState<'race' | 'training'>('race');
  const [isCardOpen, setIsCardOpen] = React.useState(true);
  const [showAthlete, setShowAthlete] = React.useState(true);

  React.useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  const handleClose = () => {
    setIsCardOpen(false);
  };

  const handleReset = (card: 'race' | 'training') => {
    setActiveCard(card);
    setIsCardOpen(true);
  };

  return (
    <I18nextProvider i18n={i18n}>
      <div className="min-h-screen bg-slate-100 py-10">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <header className="bg-white shadow-sm rounded-xl p-6 border border-slate-200">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Event Card Preview</h1>
            <p className="text-slate-600 text-sm">
              Use this lightweight preview to verify styling for the race and training event cards without navigating through the full app.
              Append <code className="px-1 py-0.5 bg-slate-900/90 text-white rounded">?preview=event-cards</code> to the local dev URL.
            </p>
          </header>

          <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeCard === 'race' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
                onClick={() => handleReset('race')}
              >
                Show Race Card
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${activeCard === 'training' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'}`}
                onClick={() => handleReset('training')}
              >
                Show Training Card
              </button>
            </div>

            <div className="flex gap-2 ml-auto">
              <button
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${locale === 'en' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                onClick={() => setLocale('en')}
              >
                EN
              </button>
              <button
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${locale === 'fr' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                onClick={() => setLocale('fr')}
              >
                FR
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Show athlete</span>
              <button
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${showAthlete ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                onClick={() => setShowAthlete((prev) => !prev)}
              >
                {showAthlete ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {!isCardOpen && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              The modal is closed. Use the buttons above to reopen it.
            </div>
          )}
        </div>

        {isCardOpen && (
          activeCard === 'race' ? (
            <RaceEventCard
              event={sampleRaceEvent}
              onClose={handleClose}
              onEdit={() => console.log('Edit race click')}
              onDelete={async () => console.log('Delete race click')}
              showAthlete={showAthlete}
            />
          ) : (
            <TrainingEventCard
              event={sampleTrainingEvent}
              onClose={handleClose}
              onEdit={() => console.log('Edit training click')}
              onDelete={async () => console.log('Delete training click')}
              showAthlete={showAthlete}
            />
          )
        )}
      </div>
    </I18nextProvider>
  );
}

export default EventCardPreview;
