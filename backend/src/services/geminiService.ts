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

    const prompt = `You are a teaching assistant and AI Coach who NEVER gives direct answers or solutions.
Student doubt: '${doubtText}'
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
  "xpAwarded": number (20 if verdict=correct, 10 if partially_correct, 0 if incorrect)
}

Be specific, constructive, and educationally valuable in your feedback.`;

    const result = await generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJSONSafely(responseText, null);

    if (!parsed) return fallback;

    // Normalise: keep legacy `score` field in sync with `overallScore`
    parsed.score = parsed.overallScore ?? parsed.score ?? 50;
    parsed.overallScore = parsed.score;
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

    const prompt = `You are an expert AI Learning Assistant in an educational platform.
The student is asking a question about the subject "${subject || 'General'}" and topic "${topic || 'General'}".
Question: "${query}"

Provide a clean, helpful, and technically accurate explanation. Limit your response to 200 words. Format with markdown if helpful.`;

    const result = await generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini getGeneralExplanation failed:", error);
    return "I'm sorry, I'm currently unable to answer your query. Please ask a classmate or check the focus room discussions!";
  }
}
