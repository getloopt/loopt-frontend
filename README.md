# College Chat App

A Progressive Web App (PWA) for college students to manage their timetables and access college information.

## Features

- **Progressive Web App (PWA)** with installable capability
- **Timetable Management** with real-time sync
- **Firebase Authentication** with SSN email validation
- **Mobile-First Design** with responsive UI

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project setup

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure Firebase (see firebase-config.js)
4. Start development: `npm run dev`

### Production Build
```bash
npm run build
npm start
```

## PWA Features

- Installable on mobile devices and desktop
- App icon and splash screen
- Service worker for basic caching

## Architecture

### Context Providers:
- **AuthContext**: Handles authentication
- **TimetableContext**: Manages timetable data

## Browser Support

- Chrome 90+ (recommended)
- Firefox 90+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test PWA functionality before submitting
4. Submit a pull request

## License

This project is licensed under the MIT License.
