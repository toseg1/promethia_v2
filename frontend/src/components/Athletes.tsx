import React, { useState } from 'react';
import { Users, Plus, Search, Filter, MoreVertical, Calendar, TrendingUp, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface AthletesProps {
  user: User;
}

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  sport: string;
  joinDate: string;
  status: 'active' | 'inactive';
  upcomingEvents: number;
  completionRate: number;
  lastActivity: string;
  avatar?: string;
}

export function Athletes({ user }: AthletesProps) {
  const { t } = useTranslation('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSport, setFilterSport] = useState('all');
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);

  // Mock athletes data
  const mockAthletes: Athlete[] = [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      sport: 'Triathlon',
      joinDate: '2024-01-15',
      status: 'active',
      upcomingEvents: 3,
      completionRate: 95,
      lastActivity: '2 hours ago'
    },
    {
      id: '2',
      firstName: 'Mike',
      lastName: 'Chen',
      email: 'mike.chen@email.com',
      sport: 'Running',
      joinDate: '2024-02-20',
      status: 'active',
      upcomingEvents: 2,
      completionRate: 88,
      lastActivity: '1 day ago'
    },
    {
      id: '3',
      firstName: 'Emma',
      lastName: 'Davis',
      email: 'emma.davis@email.com',
      sport: 'Swimming',
      joinDate: '2024-03-10',
      status: 'active',
      upcomingEvents: 4,
      completionRate: 92,
      lastActivity: '3 hours ago'
    },
    {
      id: '4',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex.rivera@email.com',
      sport: 'Cycling',
      joinDate: '2024-01-08',
      status: 'inactive',
      upcomingEvents: 1,
      completionRate: 75,
      lastActivity: '1 week ago'
    }
  ];

  const sports = ['all', 'Triathlon', 'Running', 'Swimming', 'Cycling'];

  const filteredAthletes = mockAthletes.filter(athlete => {
    const matchesSearch = 
      athlete.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSport = filterSport === 'all' || athlete.sport === filterSport;
    
    return matchesSearch && matchesSport;
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50';
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('athletes.title')}</h1>
          <p className="text-muted-foreground">
            {t('athletes.subtitle')}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus size={20} />
          <span className="font-medium">{t('athletes.addAthlete')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athletes.stats.totalAthletes')}</p>
              <p className="text-2xl font-bold text-foreground">{mockAthletes.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users size={24} className="text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athletes.stats.activeAthletes')}</p>
              <p className="text-2xl font-bold text-foreground">
                {mockAthletes.filter(a => a.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athletes.stats.avgCompletion')}</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(mockAthletes.reduce((acc, a) => acc + a.completionRate, 0) / mockAthletes.length)}%
              </p>
            </div>
            <div className="p-3 bg-chart-1/10 rounded-lg">
              <TrendingUp size={24} className="text-chart-1" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athletes.stats.totalEvents')}</p>
              <p className="text-2xl font-bold text-foreground">
                {mockAthletes.reduce((acc, a) => acc + a.upcomingEvents, 0)}
              </p>
            </div>
            <div className="p-3 bg-chart-2/10 rounded-lg">
              <Calendar size={24} className="text-chart-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-border/20 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('athletes.searchAthletesPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {sports.map(sport => (
              <option key={sport} value={sport}>
                {sport === 'all' ? t('athletes.table.allSports') : sport}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Athletes List */}
      <div className="bg-white rounded-xl border border-border/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border/20">
              <tr>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.athlete')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.sport')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.status')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.upcomingEvents')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.completionRate')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.lastActivity')}</th>
                <th className="text-left p-4 font-medium text-foreground">{t('athletes.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAthletes.map((athlete) => (
                <tr 
                  key={athlete.id} 
                  className="border-b border-border/10 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(athlete.firstName, athlete.lastName)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {athlete.firstName} {athlete.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {athlete.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-muted/50 text-foreground rounded-full text-sm">
                      {athlete.sport}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(athlete.status)}`}>
                      {athlete.status.charAt(0).toUpperCase() + athlete.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span className="text-foreground">{athlete.upcomingEvents}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`font-medium ${getCompletionColor(athlete.completionRate)}`}>
                      {athlete.completionRate}%
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-muted-foreground text-sm">
                      {athlete.lastActivity}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAthlete(athlete.id)}
                        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        {t('athletes.table.viewCalendar')}
                      </button>
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAthletes.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('athletes.emptyState.noAthletesFound')}</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterSport !== 'all'
                ? t('athletes.emptyState.adjustFilters')
                : t('athletes.emptyState.addFirstAthlete')
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}