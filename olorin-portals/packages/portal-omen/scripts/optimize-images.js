const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImages() {
  console.log('🖼️  Starting image optimization...\n');

  const images = [
    {
      input: 'public/images/Omen.png',
      outputs: [
        { file: 'public/images/Omen.webp', format: 'webp', quality: 80 },
        { file: 'public/images/Omen-1x.webp', format: 'webp', quality: 80, width: 384 },
        { file: 'public/images/Omen-2x.webp', format: 'webp', quality: 80, width: 768 },
        { file: 'public/images/Omen-3x.webp', format: 'webp', quality: 80, width: 1152 },
      ]
    },
    {
      input: 'public/images/Wizard.png',
      outputs: [
        { file: 'public/images/Wizard.webp', format: 'webp', quality: 85 },
      ]
    }
  ];

  for (const img of images) {
    console.log(`Processing: ${img.input}`);

    // Check if input file exists
    if (!fs.existsSync(img.input)) {
      console.error(`❌ Input file not found: ${img.input}`);
      continue;
    }

    for (const output of img.outputs) {
      try {
        let pipeline = sharp(img.input);

        if (output.width) {
          pipeline = pipeline.resize(output.width);
        }

        await pipeline[output.format]({ quality: output.quality }).toFile(output.file);

        const stats = fs.statSync(output.file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  ✓ Created: ${output.file} (${sizeKB} KB)`);
      } catch (error) {
        console.error(`  ❌ Failed to create ${output.file}:`, error.message);
      }
    }
    console.log('');
  }

  console.log('✅ Image optimization complete!\n');
}

optimizeImages().catch(error => {
  console.error('❌ Optimization failed:', error);
  process.exit(1);
});
