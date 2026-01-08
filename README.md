# Appium UI Watchers Plugin

An Appium 3.x plugin that automatically handles unexpected UI elements (popups, banners, dialogs) during test execution without explicit waits.

## Features

- **Zero Wait Overhead:** No waiting for UI elements that may never appear
- **Centralized Management:** Register watchers once, apply across entire session
- **Priority-Based Control:** Handle most common cases first for optimal performance
- **Session-Scoped:** Watchers persist across multiple test operations

## Installation

### Install the plugin

```bash
appium plugin install --source=local /path/to/appium-uiwatchers-plugin
```

### Verify installation

```bash
appium plugin list
```

You should see `uiwatchers` in the installed plugins list.

## Usage

### Activate the plugin

Add the plugin to your Appium server command line:

```bash
appium --use-plugins=uiwatchers
```

### Register a watcher

```javascript
await driver.execute('mobile: registerUIWatcher', {
  name: 'cookie-consent',
  priority: 10,
  referenceLocator: {
    using: 'id',
    value: 'com.app:id/cookie_banner',
  },
  actionLocator: {
    using: 'id',
    value: 'com.app:id/accept_button',
  },
  duration: 60000,
  stopOnFound: false,
  cooldownMs: 5000,
});
```

## Development

### Prerequisites

- Node.js 14+
- Appium 3.x

### Setup

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

```

### Project Structure

```
/
├── src/              # TypeScript source code
├── test/             # All tests (unit, integration, e2e)
```

## Author

Vinodh Raj R
