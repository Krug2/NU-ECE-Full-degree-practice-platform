import { questionSchema, type Question } from "../contracts";

export function composeRefresherQuestion(questions: Question[], identity: Pick<Question, "id" | "familyId" | "courseId" | "objectiveId">): Question {
  if (questions.some(question => question.figure)) throw new Error("Multipart questions need a separate accessible figure design");
  return questionSchema.parse({
    ...identity, familyVersion: 1, category: "application", critical: true,
    prompt: questions.map((question, index) => `Part ${index+1}. ${question.prompt}`).join(" "),
    fields: questions.flatMap((question, index) => question.fields.map(field => ({
      ...field, id: `p${index+1}-${field.id}`, label: `Part ${index+1}: ${field.label}`,
      ...(field.kind === "rational-expression" ? { domainFieldId: `p${index+1}-${field.domainFieldId}` } : {}),
    }))),
    parameters: Object.fromEntries(questions.flatMap((question, index) => Object.entries(question.parameters).map(([key, value]) => [`p${index+1}-${key}`, value]))),
    hints: [0, 1, 2].map(level => questions.map((question, index) => `Part ${index+1}: ${question.hints[level]}`).join(" ")),
    explanation: questions.flatMap((question, index) => question.explanation.map(step => `Part ${index+1}: ${step}`)),
    answerSummary: questions.map((question, index) => `Part ${index+1}: ${question.answerSummary}`).join(" "),
  });
}
