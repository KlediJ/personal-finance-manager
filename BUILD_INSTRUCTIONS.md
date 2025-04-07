# Building and Packaging Instructions

The application now has full support for both development and production environments.

## Development Environment

To run the development environment:

```bash
npm start
```

This starts the Webpack dev server and Electron application in development mode.

## Production Build and Packaging

To build and package the application for production:

1. Build the production version:
   ```bash
   npm run build:prod
   ```

2. Package the application for your platform:
   ```bash
   npm run package:win   # For Windows
   npm run package:mac   # For macOS
   npm run package:linux # For Linux
   ```

   Or simply use:
   ```bash
   npm run package
   ```

3. You can also run both steps in one command:
   ```bash
   npm run dist
   ```

The packaged application will be available in the `release` folder.

## Environment Indicators

The application now includes visual indicators to help you identify which environment you're working in:

- **Development**: Red indicator in the bottom-right corner
- **Production**: Green indicator in the bottom-right corner

You can hover over these indicators to see additional environment information, including the database path.

## Database Files

Each environment uses a separate database file:

- **Development**: `finance_manager_dev.db`
- **Production**: `finance_manager.db`

This allows you to freely experiment in development without affecting your production data.
