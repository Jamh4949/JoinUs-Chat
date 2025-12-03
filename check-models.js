const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.argv[2];
  if (!apiKey) {
    console.error("Please provide your API key as an argument.");
    console.error("Usage: node check-models.js YOUR_API_KEY");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // For listing models, we don't need a specific model instance, 
    // but the SDK doesn't expose listModels directly on genAI.
    // We have to use the model manager if available, or just try to get a model.
    // Actually, the SDK has a way to list models via the API, but maybe not directly exposed easily in the high level helper?
    // Let's try to just run a generateContent with a known model and see if it works.
    
    console.log("Testing gemini-1.5-flash...");
    const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    try {
        const result = await modelFlash.generateContent("Hello");
        console.log("✅ gemini-1.5-flash is working!");
        console.log(result.response.text());
    } catch (e) {
        console.error("❌ gemini-1.5-flash failed:", e.message);
    }

    console.log("\nTesting gemini-pro...");
    const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
    try {
        const result = await modelPro.generateContent("Hello");
        console.log("✅ gemini-pro is working!");
        console.log(result.response.text());
    } catch (e) {
        console.error("❌ gemini-pro failed:", e.message);
    }

  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
