# Test Automation Suite

This project provides a complete workflow for recording user interactions via a Chrome Extension and generating Cypress tests automatically from JSON.

Project Structure:
test-automation-suite/
│
├── recorder-extension/ # Chrome Extension for recording user actions
│ ├── manifest.json
│ ├── background.js
│ ├── content.js
│ ├── popup.html
│ └── popup.js
│
├── cypress-test-generator/ # Node.js tool to generate Cypress specs
│ ├── tests.json # JSON schema for tests
│ ├── generator.js # Script to generate Cypress spec files
│ └── output/ # Generated Cypress spec files
│
└── cypress/ # Cypress project
├── e2e/
│ ├── generated/ # Auto-generated spec files
│ └── manual/ # Handwritten tests
├── fixtures/
│ └── test-data.json # Additional test data
├── support/
│ ├── commands.js # Custom Cypress commands
│ └── pageObjects/ # Page Object Model classes
├── cypress.config.js
└── package.json

Features:

- Chrome Extension Recorder: Captures clicks, typing, and interactions.
- JSON Export: Saves recorded steps in a structured JSON format.
- Cypress Test Generator: Converts JSON into ready-to-run Cypress spec files.
- Page Object Model (POM): For maintainable and reusable selectors.
- Custom Commands: Extend Cypress with reusable actions.

Setup Instructions:

1. Clone the Repository:
   git clone <your-repo-url>
   cd test-automation-suite

2. Install Dependencies:
   For Cypress:
   cd cypress
   npm install
   For Test Generator:
   cd ../cypress-test-generator
   npm install

Chrome Extension Setup:

1. Open Chrome → chrome://extensions
2. Enable Developer Mode
3. Click Load Unpacked and select recorder-extension/
4. Use the popup to Start Recording, Stop, and Export JSON

Generate Cypress Tests:

1. Place exported JSON in cypress-test-generator/tests.json
2. Run the generator:
   node generator.js
3. Generated spec files will appear in:
   cypress/e2e/generated/

Run Cypress Tests:
cd cypress
npx cypress open
or headless:
npx cypress run

Next Steps:

- Add conditional steps, waits, loops in JSON.
- Integrate CI/CD pipeline for auto-generation before test runs.
- Add selector strategy for better replay (CSS/XPath).
- Create CLI tool for generator: npx cypress-gen --input tests.json

License:
MIT
