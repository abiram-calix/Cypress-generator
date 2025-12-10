const fs = require('node:fs').promises;
const path = require('node:path');

if (process.argv.length < 3) {
    console.log('Not enough arguments');
    return;
}
const jsonPath = process.argv[2];
const jsonAbsolutePath = __dirname + path.resolve(jsonPath);

async function getJSONFile(jsonPath) {
    try {
        const data = await fs.readFile(jsonPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error occured while getting json file');
    }
}

const getCypressDescribeBlock = (description) => {
    return `describe("${description}", () => {`
}

function createTestCode(JSONTestObject) {
    let codeBlock = '';
    codeBlock = codeBlock + getCypressDescribeBlock(JSONTestObject.name);
    codeBlock += `\n  it('should perform all steps', () => {`;

    JSONTestObject.steps.forEach((step) => {
        const action = step.action;

        switch (action) {
            case 'visit':
                codeBlock += `\n    cy.visit("${step.value}");\n    cy.wait(5000);`;
                break;

            case 'click':
                codeBlock += `\n    cy.get('${step.selector}').click();`;
                break;

            case 'type':
                codeBlock += `\n    cy.get('${step.selector}').type('${step.value}');`;
                break;

            case 'select':
                codeBlock += `\n    cy.get('${step.selector}').select('${step.value}');`;
                break;

            case 'select-date':
                codeBlock += `\n    cy.get('${step.selector}').contains('button', '${step.value}').click();`;
                break;

            case 'assertText':
                codeBlock += `\n    cy.get('${step.selector}').should('contain.text', '${step.value}');`;
                break;

            case 'assertValue':
                codeBlock += `\n    cy.get('${step.selector}').should('have.value', '${step.value}');`;
                break;

            case 'assertUrl':
                codeBlock += `\n    cy.url().should('include', '${step.value}');`;
                break;

            default:
                break;
        }
    });

    codeBlock += `\n  });\n});`;
    return codeBlock;
}

getJSONFile(jsonAbsolutePath).then((data) => {
    const cypressTestFileName = data.tests[0].name.split(' ')[0];
    const cypressTestCode = createTestCode(data.tests[0]);
    const targetDir = path.join(__dirname, '..', 'cypress', 'cypress', 'e2e', 'generated', `${cypressTestFileName}.cy.js`);
    fs.writeFile(targetDir, cypressTestCode, (err) => {
        console.log('file created');
    });
});
