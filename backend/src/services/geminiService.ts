import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

let activeModelName = "gemini-1.5-flash";

async function generateContent(prompt: string, retries = 1): Promise<any> {
  try {
    const modelInstance = genAI.getGenerativeModel({ model: activeModelName });
    return await modelInstance.generateContent(prompt);
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (retries > 0 && errMsg.includes("gemini-1.5-flash") && errMsg.includes("not found")) {
      console.warn("gemini-1.5-flash not found, falling back to gemini-2.5-flash");
      activeModelName = "gemini-2.5-flash";
      return await generateContent(prompt, retries - 1);
    }
    throw error;
  }
}

function parseJSONSafely(text: string, fallback: any) {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Error parsing JSON from Gemini response:', err, 'Raw response:', text);
    return fallback;
  }
}

export async function analyzeDoubt(doubtText: string, subject: string) {
  const fallback = {
    topic: "General Concept",
    difficulty: "medium" as const,
    conceptExplanation: "AI analysis temporarily unavailable. Please try again.",
    keyTerms: [] as string[],
    confidenceScore: 0,
    suggestedApproach: "Break the problem into smaller parts"
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for analyzeDoubt.");
      return fallback;
    }

    const prompt = `You are an educational AI assistant.
Analyze this student doubt:
'${doubtText}'
Subject: ${subject}

Return ONLY a JSON object with:
{
  "topic": string (specific topic name),
  "difficulty": "easy" | "medium" | "hard",
  "conceptExplanation": string (2-3 lines explaining the concept),
  "keyTerms": string[] (3-5 important terms),
  "confidenceScore": number (0-100),
  "suggestedApproach": string (how to think about this problem)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini analyzeDoubt failed, returning fallback:", error);
    return fallback;
  }
}

export async function generateHints(doubtText: string, level: number) {
  const fallback = {
    hint: "AI hint generation is temporarily unavailable. Try analyzing key terms or reviewing the textbook.",
    hintLevel: level,
    encouragement: "Keep trying! Every step counts."
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for generateHints.");
      return fallback;
    }

    const prompt = `You are a teaching assistant who never gives direct answers.
Student doubt: '${doubtText}'
Hint level: ${level} out of 3

Level 1: Give a very small clue
Level 2: Give a slightly bigger hint
Level 3: Give a strong hint but DO NOT give the full answer

Return ONLY a JSON object with:
{
  "hint": string,
  "hintLevel": number,
  "encouragement": string (short motivating message)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini generateHints failed, returning fallback:", error);
    return fallback;
  }
}

export async function evaluateAnswer(doubtText: string, answerText: string) {
  const fallback = {
    verdict: "partially_correct" as const,
    score: 50,
    correctness: 50,
    clarity: 50,
    completeness: 50,
    feedback: "Evaluation unavailable. Good effort, review key concepts.",
    missingConcepts: [] as string[],
    xpAwarded: 10
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for evaluateAnswer.");
      return fallback;
    }

    const prompt = `You are an expert educational evaluator.
Original doubt: '${doubtText}'
Student answer: '${answerText}'

Evaluate this answer strictly and fairly.
Return ONLY a JSON object with:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "score": number (0-100),
  "correctness": number (0-100),
  "clarity": number (0-100),
  "completeness": number (0-100),
  "feedback": string (what is good and what is missing),
  "missingConcepts": string[] (concepts not covered),
  "xpAwarded": number (20 if correct, 10 if partial, 0 if wrong)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini evaluateAnswer failed, returning fallback:", error);
    return fallback;
  }
}

export async function refereeAnswers(doubtText: string, answers: string[]) {
  const fallback = {
    bestAnswerIndex: 0,
    ranking: Array.from({ length: answers.length }, (_, i) => i),
    comparison: "Referee unavailable. Showing default ordering.",
    missingInAll: [] as string[],
    winner: "Completed submission review."
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for refereeAnswers.");
      return fallback;
    }

    const prompt = `You are a fair debate referee in education.
Original doubt: '${doubtText}'
Student answers to compare: 
${JSON.stringify(answers)}

Compare all answers and decide the best one.
Return ONLY a JSON object with:
{
  "bestAnswerIndex": number,
  "ranking": number[] (indexes ranked best to worst),
  "comparison": string (why one answer is better),
  "missingInAll": string[] (what all answers missed),
  "winner": string (short reason why best answer won)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini refereeAnswers failed, returning fallback:", error);
    return fallback;
  }
}

export async function shouldEscalate(doubtText: string, attempts: number, difficulty: string, confidenceScore: number) {
  const fallback = {
    shouldEscalate: false,
    reason: "Escalation check unavailable.",
    urgencyLevel: "low" as const,
    suggestion: "Prompt student for clarification."
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for shouldEscalate.");
      return fallback;
    }

    const prompt = `You are an AI escalation manager.
Doubt: '${doubtText}'
Difficulty: ${difficulty}
Number of answer attempts: ${attempts}
AI confidence score: ${confidenceScore}

Should this doubt be escalated to a teacher?
Return ONLY a JSON object with:
{
  "shouldEscalate": boolean,
  "reason": string,
  "urgencyLevel": "low" | "medium" | "high",
  "suggestion": string (what teacher should focus on)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini shouldEscalate failed, returning fallback:", error);
    return fallback;
  }
}

export async function testConnection() {
  const result = await generateContent("Say hello in one sentence");
  return result.response.text().trim();
}
