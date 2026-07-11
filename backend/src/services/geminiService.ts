import { GoogleGenerativeAI } from "@google/generative-ai";
import { Doubt, Answer } from '../models/Schemas';

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

export class GeminiService {
  private static maxRetries = parseInt(process.env.MAX_GEMINI_RETRIES || "3", 10);
  private static timeoutMs = parseInt(process.env.GEMINI_TIMEOUT || "30000", 10);
  private static modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  // Central execution method with Retry policy, Timeout, and Logging
  static async executeWithRetry(requestType: string, prompt: string | any[]): Promise<any> {
    let attempt = 0;
    let delay = 2000; // start with 2s
    const startTime = Date.now();

    while (true) {
      attempt++;
      const attemptStartTime = Date.now();
      try {
        // Enforce Timeout via Promise.race
        const apiCallPromise = (async () => {
          const modelInstance = genAI.getGenerativeModel({ model: this.modelName });
          return await modelInstance.generateContent(prompt as any);
        })();

        // Create a timeout promise that will reject after timeoutMs
        let timeoutId: any;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("GEMINI_TIMEOUT_EXCEEDED"));
          }, this.timeoutMs);
        });

        // Race them!
        const result = await Promise.race([apiCallPromise, timeoutPromise]);
        clearTimeout(timeoutId); // Clear timeout if apiCall succeeded

        const responseTime = Date.now() - attemptStartTime;

        // Log success
        console.log(`[GEMINI SERVICE LOG] [${new Date().toISOString()}] RequestType=${requestType} Attempt=${attempt} Status=Success ResponseTime=${responseTime}ms`);
        return result;

      } catch (error: any) {
        const responseTime = Date.now() - attemptStartTime;
        const errMsg = error?.message || String(error);
        const errStatus = error?.status || (errMsg === "GEMINI_TIMEOUT_EXCEEDED" ? 408 : 500);

        // Log attempt failure
        console.warn(`[GEMINI SERVICE LOG] [${new Date().toISOString()}] RequestType=${requestType} Attempt=${attempt} Status=Failure ErrorCode=${errStatus} Error="${errMsg}" ResponseTime=${responseTime}ms`);

        // Check if retryable
        const isRetryable = 
          errStatus === 503 || 
          errStatus === 429 || 
          errStatus === 408 || 
          errMsg.includes("experiencing high demand") || 
          errMsg.includes("503") || 
          errMsg.includes("429") ||
          errMsg.includes("fetch failed") ||
          errMsg.includes("timeout") ||
          errMsg === "GEMINI_TIMEOUT_EXCEEDED";

        if (isRetryable && attempt <= this.maxRetries) {
          console.log(`[GEMINI SERVICE] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff: 2s -> 4s -> 8s
          continue;
        }

        // Final failure reached: Wrap in clean structured error format
        const finalError = new Error(errMsg) as any;
        finalError.status = errStatus;
        finalError.requestType = requestType;
        throw finalError;
      }
    }
  }

  // AI Learning Path (Requirement 9)
  static async generateLearningPath(studentStats: any, weakTopics: string[]): Promise<string> {
    const prompt = `You are an expert AI academic advisor. Design a personalized study learning path for student with stats:
${JSON.stringify(studentStats)}
Weak Topics: ${weakTopics.join(', ')}
Outline:
1. Short term focus goals
2. Concepts to study
3. Practice milestones`;
    const result = await this.executeWithRetry("AI_LEARNING_PATH", prompt);
    return result.response.text().trim();
  }
}

// Wrapper for backwards compatibility
async function generateContent(prompt: string | any[], requestType: string = "General"): Promise<any> {
  let resolvedType = requestType;
  if (typeof prompt === 'string') {
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("evaluator") || lowerPrompt.includes("rubric") || (lowerPrompt.includes("correctness") && lowerPrompt.includes("clarity") && lowerPrompt.includes("presentation"))) {
      resolvedType = "AI_EVALUATOR";
    } else if (lowerPrompt.includes("referee") || lowerPrompt.includes("comparing answers") || lowerPrompt.includes("multiple student answers")) {
      resolvedType = "AI_REFEREE";
    } else if (lowerPrompt.includes("consensus") || lowerPrompt.includes("idealcombinedanswer")) {
      resolvedType = "AI_CONSENSUS";
    } else if (lowerPrompt.includes("ocr") || lowerPrompt.includes("character") || lowerPrompt.includes("pdf") || lowerPrompt.includes("handwriting")) {
      resolvedType = "AI_OCR";
    } else if (lowerPrompt.includes("hint") || lowerPrompt.includes("coach") || lowerPrompt.includes("assistant") || lowerPrompt.includes("follow-up")) {
      resolvedType = "AI_COACH";
    } else if (lowerPrompt.includes("practice questions") || lowerPrompt.includes("question generator") || lowerPrompt.includes("slow learner")) {
      resolvedType = "AI_QUESTION_GENERATOR";
    } else if (lowerPrompt.includes("weekly progress report") || lowerPrompt.includes("weekly report")) {
      resolvedType = "AI_SUMMARY";
    } else if (lowerPrompt.includes("student doubt") || lowerPrompt.includes("escalat") || lowerPrompt.includes("analyze this")) {
      resolvedType = "AI_SUMMARY";
    }
  } else {
    // Array prompt (e.g. OCR media)
    resolvedType = "AI_OCR";
  }
  return await GeminiService.executeWithRetry(resolvedType, prompt);
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

export async function getKnowledgeBaseContext(doubtText: string): Promise<string> {
  try {
    const savedAnswers = await Answer.find({ knowledgeBaseStatus: 'saved' })
      .limit(3)
      .populate('doubtId');

    if (!savedAnswers || savedAnswers.length === 0) {
      return '';
    }

    let context = "\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT (VERIFIED SOLUTIONS) ---\n";
    savedAnswers.forEach((ans: any, i) => {
      const dbDoubt = ans.doubtId;
      if (dbDoubt) {
        context += `Verified Solution #${i + 1} for Topic "${dbDoubt.topic || 'General'}":\n`;
        context += `Question: ${dbDoubt.title}\n`;
        context += `Verified Answer: ${ans.content}\n\n`;
      }
    });
    return context;
  } catch (error) {
    console.error("Error in getKnowledgeBaseContext RAG query:", error);
    return '';
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

    const ragContext = await getKnowledgeBaseContext(doubtText);
    const prompt = `You are a teaching assistant and AI Coach who NEVER gives direct answers or solutions.
Student doubt: '${doubtText}'
${ragContext}
Requested Hint level: ${level} out of 6

Please generate a progressive hint based on this 6-level hint ladder:
Level 1 Hint: Give a very small clue or guidance to direct the student's thinking, without showing formulas, code, or direct values.
Level 2 Hint: Give a slightly more detailed hint or conceptual connection, pointing them in the right direction.
Level 3 Hint (Concept Explanation): Explain the underlying concept, theorem, or standard laws, but DO NOT solve the user's specific problem.
Level 4 Hint (Similar Example): Show an analogous or similar problem with different values/setup solved step-by-step so they can see the pattern.
Level 5 Hint (Step-by-Step Guidance): Outline the logical steps or questions they need to solve in order to arrive at their specific answer.
Level 6 Hint (Teacher Recommendation): Recommend specific topics/material to review, suggest they consult a teacher or escalate the doubt, and explain what makes this question tricky or what common pitfalls exist.

Under NO circumstances should you give the final answer or solution to the student's doubt. Keep the hint helpful but strictly guidance-only.

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

export async function generateFollowUpReply(doubtText: string, history: any[], query: string): Promise<string> {
  const fallback = "I'm here to help, but I can't give you the direct answer. Let's think: what is the next step you tried?";

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const ragContext = await getKnowledgeBaseContext(doubtText);

    // Format history
    let historyStr = "";
    history.forEach((h, index) => {
      if (h.queryText && h.queryText.trim()) {
        historyStr += `Student: ${h.queryText}\n`;
      } else {
        historyStr += `System revealed Hint Level ${h.ladderIndex + 1}: ${h.hintContent}\n`;
      }
      if (h.hintContent && h.queryText && h.queryText.trim()) {
        historyStr += `Coach: ${h.hintContent}\n`;
      }
    });

    const prompt = `You are an educational AI Coach. You are helping a student solve a specific doubt.
Under NO circumstances should you directly solve the doubt or reveal the final answer. Keep your response encouraging and guide the student.

Original Doubt:
'${doubtText}'

${ragContext}

Conversation History so far:
${historyStr}

Student's new follow-up question:
"${query}"

Provide a helpful response that answers their question conceptually or guides their next step, without revealing the answer. Keep it under 150 words.`;

    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini generateFollowUpReply failed:", error);
    return fallback;
  }
}

// ─── UPGRADED EVALUATOR ─────────────────────────────────────────────────────
// Evaluates across 5 dimensions + returns Strengths / Weaknesses / Suggestions
export async function evaluateAnswer(doubtText: string, answerText: string) {
  const fallback = {
    verdict: "partially_correct" as const,
    overallScore: 50,
    score: 50,
    correctness: 50,
    clarity: 50,
    completeness: 50,
    logicalThinking: 50,
    presentation: 50,
    feedback: "Evaluation unavailable. Good effort, review key concepts.",
    strengths: [] as string[],
    weaknesses: [] as string[],
    suggestions: [] as string[],
    missingConcepts: [] as string[],
    bestConceptsCovered: [] as string[],
    whyStrong: "Review complete.",
    topic: "General",
    keywords: [] as string[],
    difficulty: "medium" as const,
    confidence: 80,
    xpAwarded: 10
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for evaluateAnswer.");
      return fallback;
    }

    const prompt = `You are a rigorous, fair academic evaluator for a peer-learning platform.

Original question/doubt:
"${doubtText}"

Student's answer:
"${answerText}"

Evaluate this answer across FIVE dimensions (0-100 each):
1. Correctness     — Is the content factually accurate with no errors?
2. Clarity         — Is the answer well-written, clearly structured, and easy to follow?
3. Completeness    — Does it fully address all aspects of the question?
4. Logical Thinking — Does the answer demonstrate sound reasoning and logical flow?
5. Presentation    — Is the answer well-formatted, uses examples, and looks polished?

Overall score = weighted average:
(Correctness×0.35 + Clarity×0.20 + Completeness×0.20 + LogicalThinking×0.15 + Presentation×0.10)

Also extract the detected topic, relevant keywords, answer difficulty level, and evaluator confidence score.

Return ONLY a valid JSON object with no markdown fences:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "overallScore": number,
  "correctness": number,
  "clarity": number,
  "completeness": number,
  "logicalThinking": number,
  "presentation": number,
  "feedback": string (2-3 sentence overall critique),
  "strengths": string[] (2-4 specific things done well),
  "weaknesses": string[] (2-4 specific areas to improve),
  "suggestions": string[] (2-3 actionable improvement tips),
  "missingConcepts": string[] (key concepts absent from the answer),
  "bestConceptsCovered": string[] (key concepts explained correctly in the answer),
  "whyStrong": string (1 qualitative sentence summarizing why this answer is strong),
  "topic": string (detected specific topic of the doubt/answer),
  "keywords": string[] (3-5 important tags or keywords),
  "difficulty": "easy" | "medium" | "hard",
  "confidence": number (evaluator confidence 0-100),
  "xpAwarded": number (20 if verdict=correct, 10 if partially_correct, 0 if incorrect)
}

If the overallScore is below 50, ensure each item in the "weaknesses" array describes a specific mistake or missing concept prefixed with "❌ " (e.g. "❌ Circular Wait condition is missing."), and each item in the "suggestions" array represents a clear actionable advice prefixed with "✓ " (e.g. "✓ Explain all four Coffman Conditions. Add a real-world example.").

Be specific, constructive, and educationally valuable in your feedback.`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJSONSafely(responseText, null);

    if (!parsed) return fallback;

    // Normalise: keep legacy `score` field in sync with `overallScore`
    parsed.score = parsed.overallScore ?? parsed.score ?? 50;
    parsed.overallScore = parsed.score;

    if (parsed.overallScore < 50) {
      if (Array.isArray(parsed.weaknesses)) {
        parsed.weaknesses = parsed.weaknesses.map((w: string) => w.trim().startsWith('❌') ? w.trim() : `❌ ${w.trim()}`);
      }
      if (Array.isArray(parsed.suggestions)) {
        parsed.suggestions = parsed.suggestions.map((s: string) => s.trim().startsWith('✓') ? s.trim() : `✓ ${s.trim()}`);
      }
    }
    return parsed;
  } catch (error) {
    console.error("Gemini evaluateAnswer failed, returning fallback:", error);
    return fallback;
  }
}

// ─── UPGRADED REFEREE ──────────────────────────────────────────────────────────
// Now returns per-answer rubric scores across 4 dimensions + confidence score
export async function refereeAnswers(doubtText: string, answers: string[]) {
  const buildFallback = () => ({
    bestAnswerIndex: 0,
    ranking: Array.from({ length: answers.length }, (_, i) => i),
    comparison: "Referee unavailable. Showing default ordering.",
    missingInAll: [] as string[],
    winner: "Completed submission review.",
    confidenceScore: 0,
    perAnswerScores: answers.map((_, i) => ({
      index: i,
      correctness: 50,
      clarity: 50,
      completeness: 50,
      originality: 50,
      overallScore: 50,
      strengths: "Unable to evaluate at this time.",
      weaknesses: "Unable to evaluate at this time."
    }))
  });

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for refereeAnswers.");
      return buildFallback();
    }

    const numberedAnswers = answers
      .map((a, i) => `Answer ${i + 1}:\n${a}`)
      .join('\n\n---\n\n');

    const prompt = `You are a rigorous, fair academic referee evaluating multiple student answers to the same question.

Original question/doubt:
"${doubtText}"

Student Answers (${answers.length} total):
${numberedAnswers}

Evaluate ALL answers across these four dimensions (0-100 each):
- Correctness: Is the answer factually accurate and free from errors?
- Clarity: Is it well-written, easy to understand, and logically organized?
- Completeness: Does it cover all key aspects of the question?
- Originality: Does it show unique insight, creative explanation, or go beyond obvious answers?

Overall score = weighted average: (Correctness x 0.40 + Clarity x 0.25 + Completeness x 0.25 + Originality x 0.10)

Return ONLY a valid JSON object with no markdown code fences:
{
  "perAnswerScores": [
    {
      "index": 0,
      "correctness": number,
      "clarity": number,
      "completeness": number,
      "originality": number,
      "overallScore": number,
      "strengths": string,
      "weaknesses": string
    }
  ],
  "bestAnswerIndex": number,
  "ranking": number[],
  "winner": string,
  "comparison": string,
  "missingInAll": string[],
  "confidenceScore": number
}

Rules:
- perAnswerScores must have exactly ${answers.length} entries, indexed 0 to ${answers.length - 1}
- ranking is 0-based indexes sorted best to worst
- missingInAll lists concepts ALL answers missed (empty array if none)
- confidenceScore is how confident you are in this evaluation (0-100)
- winner is a 1-2 sentence reason the best answer won
- comparison is 2-3 sentences comparing answers holistically`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJSONSafely(responseText, null);

    if (!parsed || !parsed.perAnswerScores) {
      console.warn("Gemini refereeAnswers: invalid response shape, using fallback");
      return buildFallback();
    }

    return parsed;
  } catch (error) {
    console.error("Gemini refereeAnswers failed, returning fallback:", error);
    return buildFallback();
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

export async function generateFocusRoomQuestions(weakTopics: string[], subject: string) {
  const fallback = [
    { questionText: "What is a deadlock in OS?", difficulty: "easy", topic: "Deadlocks", hint: "Think about circular waiting where everyone is waiting for someone else.", expectedAnswer: "A deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting for another resource held by some other process." },
    { questionText: "Explain the Mutual Exclusion condition in deadlock.", difficulty: "easy", topic: "Deadlocks", hint: "Only one process can use a resource at a time.", expectedAnswer: "Mutual Exclusion condition means at least one resource must be held in a non-shareable mode." },
    { questionText: "What is Banker's Algorithm used for?", difficulty: "medium", topic: "Deadlocks", hint: "It is a deadlock avoidance algorithm.", expectedAnswer: "It is used for deadlock avoidance by simulating resource allocation to determine safety." },
    { questionText: "Explain the four conditions necessary for deadlock to occur.", difficulty: "medium", topic: "Deadlocks", hint: "Mutual exclusion, Hold & wait, No preemption, Circular wait.", expectedAnswer: "The four conditions are Mutual exclusion, Hold and wait, No preemption, and Circular wait." },
    { questionText: "Describe how to recover from a deadlock.", difficulty: "hard", topic: "Deadlocks", hint: "Process termination or resource preemption.", expectedAnswer: "Deadlock recovery can be achieved by terminating one or more processes or preempting resources." }
  ];

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for generateFocusRoomQuestions.");
      return fallback.map(q => ({
        ...q,
        subject,
        addedBy: 'ai' as const,
        createdAt: new Date()
      }));
    }

    const prompt = `You are an educational question generator.
Generate 5 practice questions for slow learner students.

Subject: ${subject}
Weak Topics: ${weakTopics.join(', ')}
Difficulty: Start easy, gradually increase

Return ONLY a JSON array:
[
  {
    "questionText": string,
    "difficulty": "easy" | "medium" | "hard",
    "topic": string,
    "hint": string (small hint for students),
    "expectedAnswer": string (for AI evaluation later)
  }
]

Make questions clear, specific, and suitable for college students.`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJSONSafely(responseText, fallback);
    if (Array.isArray(parsed)) {
      return parsed.map((q: any) => ({
        questionText: q.questionText || "Question topic placeholder",
        subject: q.topic || subject,
        difficulty: q.difficulty || "medium",
        addedBy: 'ai' as const,
        topic: q.topic || weakTopics[0] || "General",
        hint: q.hint || "Review core concept notes.",
        expectedAnswer: q.expectedAnswer || "Review textbook safety criteria.",
        createdAt: new Date()
      }));
    }
    return fallback.map(q => ({
      ...q,
      subject,
      addedBy: 'ai' as const,
      createdAt: new Date()
    }));
  } catch (error) {
    console.error("Gemini generateFocusRoomQuestions failed, returning fallback:", error);
    return fallback.map(q => ({
      ...q,
      subject,
      addedBy: 'ai' as const,
      createdAt: new Date()
    }));
  }
}

export async function generateWeeklyProgressReport(stats: any): Promise<string> {
  const fallback = `Weekly Progress Report:
The student has participated actively. They are doing well in overall doubts resolution but need to focus more on core subjects. Action items: Review quiz answers and practice more problems.`;

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for generateWeeklyProgressReport.");
      return fallback;
    }

    const prompt = `Generate a concise weekly progress report for a student with these stats:
${JSON.stringify(stats)}
Include: strong areas, weak areas, improvement suggestions, and teacher action items.
Keep it under 150 words.`;

    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini generateWeeklyProgressReport failed, returning fallback:", error);
    return fallback;
  }
}

export async function getGeneralExplanation(query: string, subject: string, topic: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return `Here is some general information about "${topic}" in ${subject}: Try checking your textbook for deadlock avoidance, resource allocation, and CPU scheduling.`;
    }

    const ragContext = await getKnowledgeBaseContext(query || topic || subject || '');
    const prompt = `You are an expert AI Learning Assistant in an educational platform.
The student is asking a question about the subject "${subject || 'General'}" and topic "${topic || 'General'}".
Question: "${query}"

${ragContext}

Provide a clean, helpful, and technically accurate explanation. Limit your response to 200 words. Format with markdown if helpful.`;

    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini getGeneralExplanation failed:", error);
    return "I'm sorry, I'm currently unable to answer your query. Please ask a classmate or check the focus room discussions!";
  }
}

export async function extractTextFromMedia(fileBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined, using mock fallback for extractTextFromMedia.");
      return "Mock extracted question from uploaded file: What is the efficiency of a Carnot Engine operating between 500K and 300K?";
    }

    const result = await generateContent([
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType: mimeType
        }
      },
      "You are a OCR AI assistant. Extract all text from this file (image or PDF). Specifically:\n1. Detect all text and characters, including handwriting if present.\n2. Extract all mathematical expressions, equations, and code accurately.\n3. Clean formatting, remove unnecessary spaces, and merge broken lines.\n4. Preserve the layout and structural formatting as much as possible.\n5. Return only the extracted text, without any additional explanations, intro/outro, or markdown code fences unless they are part of the extracted text. If no text is found, return an empty string."
    ]);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini extractTextFromMedia failed:", error);
    throw error;
  }
}

export async function cleanPdfText(rawText: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return rawText;
    }

    const prompt = `You are an educational AI assistant.
A student uploaded a digital PDF, and we extracted this raw text:
"${rawText}"

Please clean up the text:
1. Fix formatting, spacing, and typos if any.
2. Merge broken sentences/lines and remove headers, footers, page numbers, or watermark text if they interrupt the flow of the question.
3. Preserve math equations and programming code as formatting dictates.
4. Return ONLY the cleaned question text, without any introduction, explanations, or wrapping markdown code fences.`;

    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini cleanPdfText failed, returning raw text:", error);
    return rawText;
  }
}

export async function analyzeDoubtDetailed(questionText: string, subjectName: string) {
  const fallback = {
    topic: "General Concept",
    difficulty: "medium" as const,
    keywords: [] as string[],
    explanation: "Concept explanation temporarily unavailable."
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const prompt = `You are an educational AI assistant.
Analyze this student doubt:
Question: "${questionText}"
Subject: ${subjectName}

Return ONLY a JSON object with:
{
  "topic": string (specific topic name, e.g. "Deadlock", "Limit Theorem", "SQL Joins"),
  "difficulty": "easy" | "medium" | "hard",
  "keywords": string[] (3-5 important search keywords or concept tags),
  "explanation": string (2-3 lines explaining the underlying concept or background)
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini analyzeDoubtDetailed failed:", error);
    return fallback;
  }
}

export async function generateConsensusAnswer(doubtText: string, answers: string[]) {
  const fallback = {
    idealCombinedAnswer: "Consensus evaluation is temporarily unavailable.",
    commonCorrectConcepts: [] as string[],
    commonMistakes: [] as string[],
    missingConcepts: [] as string[],
    recommendedLearningResources: [] as string[]
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallback;
    }

    const answersList = answers.map((a, idx) => `Answer ${idx + 1}:\n${a}`).join('\n\n---\n\n');

    const prompt = `You are an educational AI expert analyzing student answers to synthesize a consensus model.
    
Original Question/Doubt:
"${doubtText}"

Submitted Answers:
${answersList}

Analyze all the submitted student answers. Synthesize the findings and generate a JSON response with:
1. "idealCombinedAnswer": A comprehensive, clear, and ideal answer combining the best parts of the submitted solutions and correcting any errors.
2. "commonCorrectConcepts": An array of concepts that the students generally got right across the answers.
3. "commonMistakes": An array of mistakes or misconceptions found in one or more student answers.
4. "missingConcepts": An array of key academic concepts that were omitted in all or most answers but are critical to fully understanding the solution.
5. "recommendedLearningResources": An array of 2-3 specific topics, books, or online search keywords recommended to study this topic deeper.

Return ONLY a valid JSON object with no markdown code fences:
{
  "idealCombinedAnswer": string,
  "commonCorrectConcepts": string[],
  "commonMistakes": string[],
  "missingConcepts": string[],
  "recommendedLearningResources": string[]
}`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    return parseJSONSafely(responseText, fallback);
  } catch (error) {
    console.error("Gemini generateConsensusAnswer failed:", error);
    return fallback;
  }
}

export async function getCoachResponse(doubtText: string, subject: string, studentMessage: string, answerText?: string, history?: any[]) {
  // Format history
  let historyStr = "";
  if (history && history.length > 0) {
    history.forEach((h: any) => {
      if (h.queryText && h.queryText.trim()) {
        historyStr += `Student: ${h.queryText}\n`;
      }
      if (h.hintContent && h.hintContent.trim()) {
        historyStr += `Coach: ${h.hintContent}\n`;
      }
    });
  }

  const prompt = `You are a professional educational AI Learning Coach.
Your goal is to guide students to think independently, discover concepts, and improve their answers.
Under NO circumstances should you directly solve the question/doubt or reveal the final solution.

Doubt/Question Context:
"${doubtText}"

Subject: "${subject}"

Conversation History:
${historyStr}

Latest Student Attempt/Answer (if any):
"${answerText || "No answer submitted yet."}"

Student Message:
"${studentMessage}"

Instructions:
1. Determine the student's intent.
   - If they are requesting a progressive Hint (e.g., "Hint 1", "Hint 2", "Hint 3" or similar):
     - Identify which hint number (1, 2, or 3) they want.
     - Enforce progressive hinting: Hint 1 must be revealed before Hint 2, and Hint 2 before Hint 3.
     - Look at the Conversation History to see which Hint numbers (Hint 1, Hint 2, Hint 3) have already been given.
     - If they request Hint 2 but Hint 1 hasn't been revealed, set "status" to "hint_blocked" and explain in "reply" that they must get Hint 1 first.
     - If they request Hint 3 but Hint 2 hasn't been revealed, set "status" to "hint_blocked" and explain in "reply" that they must get Hint 2 first.
     - If the requested hint is allowed, set "status" to "success" and generate it:
       - Hint 1: General direction. Smallest possible clue. 2 sentences. End with a thinking question.
       - Hint 2: Important concept. Mention concept/formula name. No calculations. Max 3 sentences. End with a thinking question.
       - Hint 3: Nearly complete approach. Step-by-step approach. Do not solve.
   - If they ask "Explain Concept" or want an explanation of the underlying topic/concept:
     - Explain ONLY the underlying concept, NOT the answer.
     - Use simple language, examples, analogies, small text diagrams (Markdown), step-by-step explanations.
   - If they are submitting an answer or asking you to check their logic/review mistakes:
     - Evaluate the submitted answer ("${answerText}").
     - If correct: "Excellent work! Your logic is correct. You may improve clarity by [suggestions]..."
     - If incorrect: Explain:
       - ❌ Which sentence/part is incorrect.
       - ❌ Which concept is misunderstood.
       - ❌ Which important point is missing.
       - ❌ Which logical step is wrong.
       - Give improvement suggestions. Encourage: "Please improve your answer and upload it again."
       - NEVER reveal the final correct answer or solution.
   - If they ask general questions or seek Socratic guidance (e.g., "Where should I start?", "Am I thinking correctly?", "Guide me", etc.):
     - Respond as a Socratic AI Coach. Ask questions to guide them to discover the answer themselves.

2. Return ONLY a valid JSON object matching the following structure (no markdown fences, no extra text):
{
  "intent": "HINT" | "CONCEPT_EXPLANATION" | "ANSWER_REVIEW" | "GUIDANCE",
  "status": "success" | "hint_blocked",
  "reply": "your primary chatbot message response here. Formatted in Markdown.",
  "followUpQuestion": "a Socratic question to guide the student's thinking (required for HINT, GUIDANCE, and CONCEPT_EXPLANATION)",
  "verdict": "correct" | "partially_correct" | "incorrect" | "none", // only for ANSWER_REVIEW
  "score": number, // 0-100, only for ANSWER_REVIEW
  "hintNumber": number // 1, 2, or 3, only if a hint was successfully generated
}
`;

  try {
    const result = await generateContent(prompt);
    const text = result.response.text();
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (error: any) {
    console.error("Gemini Coach parsing failed:", error);
    try {
      const result = await generateContent(prompt);
      const text = result.response.text();
      return {
        intent: 'GUIDANCE',
        status: 'success',
        reply: text,
        followUpQuestion: 'What do you think about this?',
        verdict: 'none',
        score: 0
      };
    } catch {
      return {
        intent: 'GUIDANCE',
        status: 'success',
        reply: "I encountered an error parsing the AI response. Let's try again conceptually.",
        followUpQuestion: 'What do you think about this?',
        verdict: 'none',
        score: 0
      };
    }
  }
}

export async function getDeepAnalysis(doubtText: string, subject: string) {
  const prompt = `You are an expert educational analyst.

Doubt: '${doubtText}'
Subject: '${subject}'

Give a complete deep analysis for a student who wants to understand this topic fully.
Do NOT give the answer to the doubt.
Only explain concepts and approach.

Return ONLY this JSON (no extra text):
{
  "topic": "specific topic name",
  "difficulty": "easy" | "medium" | "hard",
  "keyConcepts": [
    {
      "concept": "concept name",
      "explanation": "one line explanation"
    }
  ],
  "learningObjectives": [
    "objective 1",
    "objective 2"
  ],
  "prerequisiteConcepts": [
    "prerequisite 1",
    "prerequisite 2"
  ],
  "recommendedApproach": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  "commonMistakes": [
    "mistake 1",
    "mistake 2"
  ],
  "suggestedResources": [
    "resource 1",
    "resource 2"
  ]
}`;

  const fallback = {
    topic: "Core Concept",
    difficulty: "medium" as const,
    keyConcepts: [
      { concept: "Problem Definition", explanation: "Understanding the problem parameters and variables." }
    ],
    learningObjectives: ["Identify the core problem characteristics", "Formulate a systematic solution strategy"],
    prerequisiteConcepts: ["Basic concepts related to the subject area"],
    recommendedApproach: [
      "Step 1: Identify the given values and target variable",
      "Step 2: Formulate the equations or logical rules",
      "Step 3: Solve systematically and check boundary conditions"
    ],
    commonMistakes: [
      "Misinterpreting the question parameters",
      "Skipping intermediate verification steps"
    ],
    suggestedResources: [
      "Standard textbook chapters on this topic",
      "Socratic discussion boards"
    ]
  };

  try {
    const result = await generateContent(prompt);
    const text = result.response.text();
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini Deep Analysis parsing failed:", error);
    return fallback;
  }
}

