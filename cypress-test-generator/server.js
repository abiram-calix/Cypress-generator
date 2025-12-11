const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs').promises;
const path = require('node:path');
const url = require('node:url');
const { exec } = require('child_process');

const PORT = 4000;
const TARGET_DIR = path.join(__dirname, '..', 'cypress', 'cypress', 'e2e', 'generated');

// Ensure the target directory exists
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        // Directory already exists or other error
        if (error.code !== 'EEXIST') {
            throw error;
        }
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
                console.warn(`Unknown action: ${action}`);
                break;
        }
    });

    codeBlock += `\n  });\n});`;
    return codeBlock;
}

async function saveCypressTest(testData) {
    try {
        // Ensure the target directory exists
        await ensureDirectoryExists(TARGET_DIR);

        // Validate test data structure
        if (!testData.tests || !Array.isArray(testData.tests) || testData.tests.length === 0) {
            throw new Error('Invalid test data structure: missing tests array');
        }

        // Generate test code for each test in the JSON
        const results = [];

        for (const test of testData.tests) {
            if (!test.name || !test.steps) {
                console.warn('Skipping test object without name or steps');
                continue;
            }

            const cypressTestFileName = test.name.replace(/\s+/g, '_').toLowerCase();
            const cypressTestCode = createTestCode(test);
            const targetPath = path.join(TARGET_DIR, `${cypressTestFileName}.cy.js`);

            await fs.writeFile(targetPath, cypressTestCode, 'utf8');

            results.push({
                fileName: `${cypressTestFileName}.cy.js`,
                filePath: targetPath,
                testName: test.name
            });
        }

        return {
            success: true,
            message: `Successfully created ${results.length} test file(s)`,
            files: results
        };
    } catch (error) {
        console.error('Error saving cypress test:', error);
        throw error;
    }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Only handle POST requests to /generate-test
    if (req.method === 'POST' && req.url === '/generate-test') {
        let body = '';

        // Collect request body
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Parse JSON from request body
                const jsonData = JSON.parse(body);
                const cypressTestFileName = jsonData.tests[0].name.replace(/\s+/g, '_').toLowerCase();
                // console.log(body);

                // // Generate and save Cypress test files
                const result = await saveCypressTest(jsonData);

                // // Send success response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
                // Single command that chains all operations
                exec(`cd ../cypress && npx cypress run --config-file cypress.config.js --spec "cypress/e2e/generated/recorded_test.cy.js"`,
                    (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`stderr: ${stderr}`);
                        }
                        console.log(`stdout: ${stdout}`);
                    }
                );
            } catch (error) {
                console.error('Error processing request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message || 'Invalid JSON data or processing error'
                }));
            }
        });

        // Handle request errors
        req.on('error', (error) => {
            console.error('Request error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Internal server error during request processing'
            }));
        });

    } else if (req.method === 'GET' && req.url === '/health') {
        // Health check endpoint
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));

    } else {
        // Handle 404 for other routes
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Endpoint not found. Use POST /generate-test'
        }));
    }
});

// Start server
server.listen(PORT, async () => {
    console.log(`Cypress Test Generator API running at http://localhost:${PORT}`);
    console.log(`Target directory: ${TARGET_DIR}`);

    try {
        await ensureDirectoryExists(TARGET_DIR);
        console.log('Target directory ready');
    } catch (error) {
        console.error('Failed to create target directory:', error);
    }
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Graceful shutdown
// process.on('SIGTERM', () => {
//     console.log('SIGTERM received, shutting down gracefully');
//     server.close(() => {
//         console.log('Server closed');
//         process.exit(0);
//     });
// });

// process.on('SIGINT', () => {
//     console.log('SIGINT received, shutting down gracefully');
//     server.close(() => {
//         console.log('Server closed');
//         process.exit(0);
//     });
// });