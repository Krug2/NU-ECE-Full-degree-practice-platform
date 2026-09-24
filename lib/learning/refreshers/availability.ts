import arithmetic from "@/content/learning-packs/f01.json";
import algebra from "@/content/learning-packs/f02.json";
import functions from "@/content/learning-packs/f03.json";
import trigonometry from "@/content/learning-packs/f04.json";

const packs = [arithmetic, algebra, functions, trigonometry];
export const refresherAvailable = (courseId: string) => packs.some(pack => pack.courseId === courseId && ["preview", "reviewed"].includes(pack.status));
