# Eunomia Next.js

A Next.js application for AI conversation evaluation and testing, migrated from the original Vite-based React application.

## Features

- **AI Conversation Testing**: Test and evaluate AI chatbot conversations
- **Automated Scoring**: Score conversations based on custom metrics
- **Session Management**: Save and load evaluation sessions
- **Real-time Simulation**: Simulate conversations with various AI models
- **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS
- **Component Library**: Uses shadcn/ui components for consistent design

## Tech Stack

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: React Context API
- **Data Fetching**: TanStack Query
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── lib/                  # Utility functions
└── pages/                # Legacy pages (for reference)
```

## Migration Notes

This project was migrated from a Vite-based React application to Next.js with the following changes:

1. **App Router**: Converted from React Router to Next.js App Router
2. **Client Components**: Added "use client" directives where needed
3. **Layout Structure**: Moved providers to the root layout
4. **Dependencies**: Updated to Next.js-compatible versions
5. **Build System**: Changed from Vite to Next.js build system

## Features Overview

### Dashboard
- Overview of evaluation sessions
- Quick start for new evaluations
- Session management

### Test Configuration
- Configure chatbot settings
- Set up test cases
- Define scoring metrics

### Conversation Simulation
- Simulate conversations with AI models
- Real-time conversation flow
- Multiple conversation modes

### Automated Scoring
- Score conversations based on metrics
- Custom scoring rubrics
- Detailed feedback

### Results Analysis
- View scoring results
- Export data
- Session history

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.