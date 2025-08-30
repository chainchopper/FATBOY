const { execSync } = require('child_process');
const ports = [3000, 8080, 4200, 4300]; // Common development ports

let started = false;

for (const port of ports) {
  try {
    console.log(`Attempting to start Angular on port ${port}...`);
    // Use --disable-host-check for broader compatibility in dev environments
    execSync(`ng serve --port ${port} --disable-host-check`, { stdio: 'inherit' });
    started = true;
    break;
  } catch (error) {
    // Check if the error is specifically a port-in-use error
    if (error.message.includes('EADDRINUSE') || error.message.includes('Address already in use')) {
      console.warn(`Port ${port} is in use. Trying next port...`);
    } else {
      console.error(`An unexpected error occurred while trying port ${port}:`, error.message);
      // If it's not a port-in-use error, we might want to stop trying
      // For now, we'll continue to the next port as a fallback
    }
  }
}

if (!started) {
  console.error('Failed to start Angular on any available port. Please check your system or try manually specifying a port.');
  process.exit(1);
}