import arithmetic from "@/content/learning-packs/f01.json";
import algebra from "@/content/learning-packs/f02.json";

const packs = [arithmetic, algebra];
export const refresherAvailable = (courseId: string) => packs.some(pack => pack.courseId === courseId && ["preview", "reviewed"].includes(pack.status));
