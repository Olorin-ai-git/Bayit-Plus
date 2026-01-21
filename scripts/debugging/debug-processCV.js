// Debug script to test processCV function call
const jobId = "ixFeVrpBWEVfVJgYckh9";
const fileUrl = "https://firebasestorage.googleapis.com/v0/b/getmycv-ai.firebasestorage.app/o/users%2FWEPqkeiXHnVyctRhFB999mlz99B3%2Fuploads%2FixFeVrpBWEVfVJgYckh9%2FGIL%20KLAINERT-CV%202025.pdf?alt=media&token=e7c2271f-d956-4fbb-9f8f-70e14cb59d36";
const mimeType = "application/pdf";
const isUrl = false;

console.log("=== Debug processCV Parameters ===");
console.log("jobId:", jobId);
console.log("fileUrl:", fileUrl);
console.log("mimeType:", mimeType);
console.log("isUrl:", isUrl);

// Validate parameters as the function does
console.log("\n=== Parameter Validation ===");
console.log("jobId exists:", !!jobId);
console.log("fileUrl exists:", !!fileUrl);
console.log("isUrl value:", isUrl);
console.log("Validation passed:", !(!jobId || (!fileUrl && !isUrl)));

// Test URL parsing (as done in the function)
console.log("\n=== URL Parsing Test ===");
try {
  const urlObj = new URL(fileUrl);
  console.log("URL pathname:", urlObj.pathname);
  
  const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
  console.log("Path match:", pathMatch);
  
  if (pathMatch) {
    const filePath = decodeURIComponent(pathMatch[1]);
    console.log("Decoded file path:", filePath);
  } else {
    console.log("ERROR: Invalid storage URL format");
  }
} catch (error) {
  console.log("URL parsing error:", error.message);
}

console.log("\n=== Expected Function Call ===");
console.log("processCVFunction({");
console.log("  jobId:", `"${jobId}",`);
console.log("  fileUrl:", `"${fileUrl}",`);
console.log("  mimeType:", `"${mimeType}",`);
console.log("  isUrl:", isUrl);
console.log("});");