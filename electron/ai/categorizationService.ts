export async function categorizeBatch(descriptions: string[]): Promise<string[]> {
  const results: string[] = [];

  for (const description of descriptions) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3',
          prompt: `Categorize this transaction: "${description}". Respond with only the category name.`,
          stream: false
        })
      });
      const data = await response.json();
      results.push((data.response || '').trim());
    } catch (error) {
      console.error('Categorization error:', error);
      results.push('');
    }
  }

  return results;
}
