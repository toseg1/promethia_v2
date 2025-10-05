# Promethia Training Platform

A comprehensive training application for athletes and coaches featuring calendar management, performance metrics, analytics, and advanced training builder with glass morphism design using Material Design 3 color tokens.

## Features

- **Authentication System**: Secure login/signup with role-based access (athlete/coach)
- **Dashboard**: Personalized view for athletes and coaches with activity overview
- **Calendar Management**: Monthly and weekly views for training, race, and custom events
- **Training Builder**: Advanced interval training creation with nested structures
- **Analytics**: Performance tracking and data visualization
- **Metrics Calculator**: MAS, FPP, and CSS calculations with sport-specific presets
- **Profile Management**: User settings with performance metrics configuration
- **Coach Dashboard**: Athlete management and training oversight
- **Responsive Design**: Native iOS-like interface with seamless navigation

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4.0 with Material Design 3 tokens
- **UI Components**: Radix UI primitives with shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build Tool**: Vite
- **Fonts**: Oswald (headings) and Roboto Condensed (body)

## Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd promethia-training-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Usage

### Authentication

The app supports demo authentication with the following test scenarios:

- **Standard Login**: Use any username and password (minimum 3 characters)
- **Coach Access**: Include "coach" in username for coach role
- **Test Cases**: 
  - Username "notfound" - triggers user not found error
  - Username "disabled" - triggers account disabled error
  - Username "testinvalidpassword" with wrong password - triggers invalid password error

### Role Switching

Users can switch between athlete and coach views using the role switch button in the header/mobile menu.

### Training Builder

Create complex training sessions with:
- Warm-up, interval, rest, and cool-down components
- Nested interval structures for complex schemes
- Time or distance-based measurements
- Intensity settings with sport-specific units (MAS/FPP/CSS)
- Drag-and-drop reordering
- Template system for reusable workouts

## Project Structure

```
├── components/
│   ├── auth/          # Authentication components
│   ├── ui/            # Reusable UI components (shadcn/ui)
│   ├── figma/         # Figma-specific components
│   └── *.tsx          # Main application components
├── styles/
│   └── globals.css    # Global styles with Material Design 3 tokens
├── utils/             # Utility functions
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## Design System

The app uses Material Design 3 principles with:
- **Typography**: Oswald for headings, Roboto Condensed for body text
- **Color System**: Material Design 3 color tokens with glass morphism effects
- **Spacing**: 8px grid system
- **Border Radius**: Consistent rounded corners
- **Elevation**: Shadow system for depth
- **Motion**: Standard easing and duration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.