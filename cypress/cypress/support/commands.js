// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
const commandsToDelay = ["visit", "click", "type", "clear", "reload"];

commandsToDelay.forEach((command) => {
  Cypress.Commands.overwrite(command, (originalFn, ...args) => {
    //const result = originalFn(...args);
    return new Promise((resolve) => {
      setTimeout(() => resolve(originalFn(...args)), 500);
    });
  });
});

// Override the default click command
Cypress.Commands.overwrite("click", (originalFn, subject, options) => {
  // Merge existing options with force: true
  const newOptions = { ...options, force: true };
  return originalFn(subject, newOptions);
});
