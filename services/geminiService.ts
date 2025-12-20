
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, OptimizationResult, AnalysisResult } from "../types";
import { ANALYST_PROMPT, WRITER_PROMPT } from "../prompts";

// Helper to clean Markdown code blocks from AI response to prevent JSON parse errors
const cleanJSON = (text: string) => {
  if (!text) return "{}";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export class ResumeOptimizerService {
  private ai: GoogleGenAI;
  // Using Gemini 3 Flash for speed and intelligence
  private agentModel = "gemini-3-flash-preview"; 

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Parses resume from file input (PDF, Text, etc.) into structured data.
   */
  async parseResume(input: { mimeType: string; data: string }): Promise<ResumeData> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.data
            }
          },
          {
            text: `
                    Analyze the provided resume.
                    Extract ALL information into a structured JSON object.

                    LINKEDIN EXTRACTION RULES:
                    1. Find the LinkedIn section in the header or contact info.
                    2. If the text says "LinkedIn" or "Profile" but has an embedded hyperlink, extract the destination URL (e.g., https://www.linkedin.com/in/username).
                    3. If there is no hyperlink, extract the raw text provided for LinkedIn.
                    4. Ensure the output is a valid URL string.
                    `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { 
                      type: Type.STRING, 
                      description: "The full destination URL of the LinkedIn profile, extracted from the hyperlink metadata if available." 
                    },
            location: { type: Type.STRING },
            summary: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  period: { type: Type.STRING },
                  description: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  period: { type: Type.STRING }
                }
              }
            }
          },
          required: ["fullName", "email", "phone", "location", "summary", "experience", "skills", "education", "linkedin"]
        }
      }
    });

    const textOutput = cleanJSON(response.text || '{}');
    return JSON.parse(textOutput) as ResumeData;
  }

  /**
   * Main Orchestration Function: Analyst -> Writer
   */
  async optimizeResume(
    originalResumeText: string,
    jobDescription: string
  ): Promise<OptimizationResult> {
    
    // Robust parsing of input text
    let resumeData: ResumeData;
    try {
        resumeData = JSON.parse(cleanJSON(originalResumeText));
    } catch {
        // Fallback for raw text inputs
        resumeData = {
            fullName: "Candidate",
            email: "",
            phone: "",
            location: "",
            summary: originalResumeText.slice(0, 300) + "...",
            experience: [{
                company: "Unknown",
                role: "Experience",
                period: "Present",
                description: [originalResumeText]
            }],
            skills: [],
            education: []
        };
    }

    // --- STEP 1: THE ANALYST ---
    console.log("Step 1: Running Gap Analysis...");
    const analysisData = await this.runAnalystAgent(resumeData, jobDescription);

    // --- STEP 2: THE WRITER ---
    console.log("Step 2: Rewriting Resume...");
    const optimizedResume = await this.runWriterAgent(resumeData, analysisData);

    // --- STEP 3: CONSTRUCT RESULT ---
    return {
      originalScore: analysisData.currentScore || 50,
      optimizedScore: Math.min((analysisData.currentScore || 50) + 25, 98),
      analysis: {
        keywordGaps: analysisData.hardSkillGaps || [],
        strengths: [], 
        weaknesses: analysisData.softSkillGaps || [],
        suggestions: [
           analysisData.feedback || "Improve keyword density.",
           analysisData.rewriteInstructions || "Focus on metrics."
        ],
        breakdown: analysisData.breakdown || {
            keywords: { score: 0, feedback: "N/A" },
            relevance: { score: 0, feedback: "N/A" },
            formatting: { score: 0, feedback: "N/A" }
        }
      },
      optimizedResume: optimizedResume
    };
  }

  /**
   * Agent 1: The Analyst
   */
  private async runAnalystAgent(resume: ResumeData, jd: string): Promise<AnalysisResult> {
    const response = await this.ai.models.generateContent({
      model: this.agentModel,
      contents: `
        ${ANALYST_PROMPT}

        [CANDIDATE DATA]:
        ${JSON.stringify(resume)}

        [TARGET JOB DESCRIPTION]:
        ${jd}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentScore: { type: Type.NUMBER },
            hardSkillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            softSkillGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            rewriteInstructions: { type: Type.STRING },
            feedback: { type: Type.STRING },
            breakdown: {
                type: Type.OBJECT,
                properties: {
                    keywords: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } },
                    relevance: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } },
                    formatting: { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, feedback: { type: Type.STRING } } }
                }
            }
          },
          required: ["currentScore", "hardSkillGaps", "softSkillGaps", "rewriteInstructions", "feedback", "breakdown"]
        }
      }
    });

    const text = cleanJSON(response.text || "{}");
    try {
      return JSON.parse(text) as AnalysisResult;
    } catch (e) {
      console.error("Analyst Agent JSON parse error:", e);
      // Return a safe fallback to prevent crash
      return {
        currentScore: 50,
        hardSkillGaps: ["Analysis Failed"],
        softSkillGaps: ["Please try again"],
        rewriteInstructions: "General optimization recommended.",
        feedback: "Could not complete detailed analysis.",
        breakdown: {
             keywords: { score: 50, feedback: "N/A" },
             relevance: { score: 50, feedback: "N/A" },
             formatting: { score: 50, feedback: "N/A" }
        }
      };
    }
  }

  /**
   * Agent 2: The Writer
   */
  private async runWriterAgent(resume: ResumeData, analysis: AnalysisResult): Promise<ResumeData> {
    const response = await this.ai.models.generateContent({
      model: this.agentModel,
      contents: `
        ${WRITER_PROMPT}

        [ORIGINAL RESUME]:
        ${JSON.stringify(resume)}

        [ANALYSIS & STRATEGY]:
        - Missing Keywords: ${JSON.stringify(analysis.hardSkillGaps)}
        - Strategic Instructions: ${analysis.rewriteInstructions}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            location: { type: Type.STRING },
            summary: { type: Type.STRING },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  period: { type: Type.STRING },
                  description: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { type: Type.STRING },
                  degree: { type: Type.STRING },
                  period: { type: Type.STRING }
                }
              }
            }
          },
          required: ["fullName", "email", "summary", "experience", "skills", "education"]
        }
      }
    });

    const text = cleanJSON(response.text || "{}");
    try {
      const data = JSON.parse(text) as ResumeData;
      
      // Validation Check for LinkedIn
      // If AI returns null, empty, or a generic placeholder like "LinkedIn URL", revert to original
      const validLinkedin = (data.linkedin && data.linkedin.length > 5 && !data.linkedin.toLowerCase().includes("linkedin url")) 
            ? data.linkedin 
            : resume.linkedin;

      // Validate critical fields to avoid UI rendering crashes
      return {
        fullName: data.fullName || resume.fullName || "Candidate",
        email: data.email || resume.email || "",
        phone: data.phone || resume.phone || "",
        linkedin: validLinkedin,
        location: data.location || resume.location || "",
        summary: data.summary || resume.summary || "",
        experience: Array.isArray(data.experience) ? data.experience : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        education: Array.isArray(data.education) ? data.education : []
      };
    } catch (e) {
      console.error("Writer Agent JSON parse error:", e);
      // Return original resume if rewrite fails to prevent data loss
      return resume;
    }
  }
}
