// Add this method to the OcrResultsComponent class
isIngredientFlagged(ingredient: string): boolean {
  return this.flaggedIngredients.some(fi => 
    ingredient.toLowerCase().includes(fi.toLowerCase())
  );
}