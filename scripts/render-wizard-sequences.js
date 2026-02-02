/**
 * Render Wizard Animation Sequences
 * Renders all Remotion sequences to MP4 files for production use
 */

const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs');

// Animation sequences to render (all 7 implemented)
const SEQUENCES = [
  { id: 'SummonWizardSequence', filename: 'summon_wizard' },
  { id: 'DismissWizardSequence', filename: 'dismiss_wizard' },
  { id: 'ProcessAndPresentSequence', filename: 'process_command' },
  { id: 'MagicalRevealSequence', filename: 'magical_reveal' },
  { id: 'ErrorShakeSequence', filename: 'error_shake' },
  { id: 'SuccessSequence', filename: 'success' },
  { id: 'AcknowledgeNewSequence', filename: 'acknowledge_new' },
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '../web/public/assets/animations');

/**
 * Ensure output directory exists
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/**
 * Render all sequences
 */
async function renderAllSequences() {
  console.log('🎬 Starting Remotion rendering...\n');

  ensureOutputDir();

  // Bundle the Remotion project
  console.log('📦 Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, '../shared/remotion/Root.tsx'),
    webpackOverride: (config) => config,
  });
  console.log('✓ Bundle complete\n');

  // Render each sequence
  for (const sequence of SEQUENCES) {
    try {
      console.log(`🎥 Rendering ${sequence.id}...`);

      // Get composition
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: sequence.id,
        inputProps: {},
      });

      const outputLocation = path.join(OUTPUT_DIR, `${sequence.filename}.mp4`);

      // Render
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        bitrate: '2M',
        pixelFormat: 'yuv420p',
        inputProps: {},
      });

      // Check file size
      const stats = fs.statSync(outputLocation);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✓ ${sequence.id} rendered successfully`);
      console.log(`  → ${outputLocation}`);
      console.log(`  → Size: ${fileSizeMB} MB`);
      console.log(`  → Duration: ${(composition.durationInFrames / composition.fps).toFixed(1)}s`);
      console.log('');
    } catch (error) {
      console.error(`❌ Error rendering ${sequence.id}:`, error.message);
      console.error('');
    }
  }

  console.log('🎉 All sequences rendered successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

// Run rendering
renderAllSequences().catch((error) => {
  console.error('❌ Fatal error during rendering:', error);
  process.exit(1);
});
