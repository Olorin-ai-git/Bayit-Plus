// Completely minimal JavaScript module without React dependencies
const MinimalApp = function() {
  console.log('MinimalApp function called');
  return 'Manual Investigation Service is working!';
};

// Ensure it's exported as both default and named export
module.exports = MinimalApp;
module.exports.default = MinimalApp;