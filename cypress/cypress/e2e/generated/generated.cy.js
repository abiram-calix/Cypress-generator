/// <reference types="cypress" />

import testData from "../../fixtures/recorded-test.json"; // Place your JSON here

const actionMap = {
  // User interaction actions
  click: (step) => cy.get(step.selector).click(),
  type: (step) => cy.get(step.selector).type(step.value),
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
    cy.visit(
      "http://localhost:3000/subscription-configurator/smartbiz-starter-program?version=3&transactionId=147145515&accountId=0017000000SbVK3&jwt=eyJhbGciOiJIUzI1NiJ9.eyJBY2NvdW50IjoiQ0FMSVgiLCJFY29tQ2hlY2tvdXQiOiJ0cnVlIiwiRmlyc3ROYW1lIjoiQ29tbWVyY2UiLCJFQ29tbWVyY2VBY2Nlc3MiOlsiUXVvdGUiLCJDaGVja291dCIsIk9yZGVyIE1hbmFnZXIiXSwiQ29udGFjdElkIjoiMDAzMGcwMDAwMlRJTzRiQUFIIiwiVXNlclNGaWQiOiIwMDUwZzAwMDAwNXRvWEFBQVkiLCJBY2NvdW50U0ZpZCI6IjAwMTcwMDAwMDBtQVBtWEFBVyIsIk9yYWNsZUlkIjoiIiwiRWNvbUFjY2VzcyI6InRydWUiLCJ1c2VyVHlwZSI6IlNZU1RFTSIsIkxhc3ROYW1lIjoiU3lzdGVtIiwiaWF0IjoxNTg2Mjk0NDQ5LCJlbWFpbCI6ImNvbW1lcmNlc3lzdGVtQGNhbGl4LmNvbSIsInVzZXJuYW1lIjoiY29tbWVyY2VzeXN0ZW1AY2FsaXguY29tIn0.KhBvDhLu8WMlzL9SwmMf-vd4r26NmXuVm0KOQxsrM78&certified=false&channel=direct&zone=AMERICAS&priceBook=Standard&currency=USD&readOnly=false&groups=subscriptionAll%2CsalesUser%2CorderManagement&headerLineNumber=2&returnUrl=https%3A%2F%2Fdevcalix.bigmachines.com%2Fcommerce%2Fbuyside%2Fdocument.jsp%3Fformaction%3DperformAction%26document_id%3D4653823%26action_id%3D4654396%26bm_cm_process_id%3D4653759%26id%3D147145515"
    );
    cy.wait(5000);
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
