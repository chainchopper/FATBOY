// Replace the processExtractedText method with this corrected version
processExtractedText(text: string) {
  // Use enhanced OCR processing
  const enhancedIngredients = this.ocrEnhancer.enhanceIngredientDetection(text);
  const productName = this.ocrEnhancer.detectProductName(text);
  const brand = this.ocrEnhancer.detectBrand(text);
  
  const categories = this.ingredientParser.categorizeProduct(enhancedIngredients);
  
  // Get user preferences
  const preferences = JSON.parse(localStorage.getItem('fatBoyPreferences') || '{}');
  
  // Evaluate product
  const flaggedIngredients = this.evaluateIngredients(enhancedIngredients, preferences);
  const verdict = flaggedIngredients.length === 0 ? 'good' : 'bad';
  
  // Create product object
  const productInfo = {
    name: productName,
    brand: brand,
    ingredients: enhancedIngredients,
    verdict,
    flaggedIngredients,
    categories,
    ocrText: text
  };

  // Add to database
  const product = this.productDb.addProduct({
    ...productInfo,
    verdict: verdict as 'good' | 'bad'
  });
  
  // Store for results page
  sessionStorage.setItem('viewingProduct', JSON.stringify(product));
  this.router.navigate(['/ocr-results']);
}