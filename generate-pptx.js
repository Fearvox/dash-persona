const pptxgen = require('pptxgenjs');
const html2pptx = require('/Users/0xvox/Library/Application Support/LobsterAI/SKILLs/pptx/scripts/html2pptx.js');
const path = require('path');

async function createPresentation() {
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_16x9';
    pptx.author = 'Nolan Zhu';
    pptx.title = 'Dash Persona - Creator Intelligence Engine';
    pptx.subject = 'Product Pitch Deck';
    
    const slidesDir = '/Users/0xvox/.openclaw/workspace/dash-persona/slides';
    const slideFiles = [
        'slide01-title.html',
        'slide02-problem.html',
        'slide03-solution.html',
        'slide04-features.html',
        'slide05-stack.html',
        'slide06-stats.html',
        'slide07-memory.html',
        'slide08-pipeline.html',
        'slide09-cta.html'
    ];
    
    for (const slideFile of slideFiles) {
        const htmlPath = path.join(slidesDir, slideFile);
        console.log(`Processing: ${slideFile}`);
        try {
            await html2pptx(htmlPath, pptx);
        } catch (err) {
            console.error(`Error processing ${slideFile}:`, err.message);
        }
    }
    
    const outputPath = '/Users/0xvox/.openclaw/workspace/dash-persona/DashPersona-Pitch-Deck-Optimized.pptx';
    await pptx.writeFile({ fileName: outputPath });
    console.log(`Presentation saved to: ${outputPath}`);
}

createPresentation().catch(console.error);
