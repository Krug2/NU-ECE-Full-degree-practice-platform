import arithmetic from "@/content/learning-packs/f01.json";

const packs = [arithmetic];
export const refresherAvailable = (courseId: string) => packs.some(pack => pack.courseId === courseId && ["preview", "reviewed"].includes(pack.status));
