/// <reference types="cypress" />

import testData from "../../fixtures/recorded-test.json"; // Place your JSON here

const actionMap = {
  // Navigation actions
  visit: (step) => {
    cy.visit(step.value);
    cy.wait(5000);
  },

  // User interaction actions
  click: (step) => cy.get(step.selector).click(),
  type: (step) => {
    // Check if it's a checkbox or radio input
    cy.get(step.selector).then(($el) => {
      const inputType = $el.attr("type");
      if (inputType === "checkbox") {
        // For checkboxes, force the desired state
        if (
          step.value === "on" ||
          step.value === "true" ||
          step.value === "checked"
        ) {
          // Should be checked - force check even if already checked
          cy.get(step.selector).check({ force: true });
        } else {
          // Should be unchecked - force uncheck
          cy.get(step.selector).uncheck({ force: true });
        }
      } else if (inputType === "radio") {
        // For radio buttons, just click to select
        cy.get(step.selector).click();
      } else {
        // For text inputs, handle empty values
        if (step.value === "" || step.value == null) {
          // Just clear the input if value is empty
          cy.get(step.selector).clear();
        } else {
          // Clear first then type the value
          cy.get(step.selector).clear().type(step.value);
        }
      }
    });
  },
  select: (step) => cy.get(step.selector).select(step.value),
  "select-date": (step) => {
    // Use contains to find the button with the day text inside the date picker dialog
    cy.get(step.selector).contains("button", step.value).click();
  },

  // Assertion actions
  assertText: (step) => {
    cy.get(step.selector).should("contain.text", step.value);
  },
  assertValue: (step) => {
    cy.get(step.selector).should("have.value", step.value);
  },
  assertUrl: (step) => {
    cy.url().should("include", step.value);
  },
};

describe(testData.tests[0].name, () => {
  it("Executes recorded steps", () => {
    testData.tests[0].steps.forEach((step) => {
      const action = actionMap[step.action];
      if (action) {
        action(step);
      } else {
        throw new Error(`Unknown action: ${step.action}`);
      }
    });
  });
});
