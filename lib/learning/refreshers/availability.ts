import orientation from "@/content/learning-packs/f12.json";
import engineering from "@/content/learning-packs/f11.json";
import programming from "@/content/learning-packs/f10.json";
import complex from "@/content/learning-packs/f09.json";
import calculus from "@/content/learning-packs/f08.json";
import vectors from "@/content/learning-packs/f07.json";
import measurement from "@/content/learning-packs/f06.json";
import arithmetic from "@/content/learning-packs/f01.json";
import algebra from "@/content/learning-packs/f02.json";
import functions from "@/content/learning-packs/f03.json";
import trigonometry from "@/content/learning-packs/f04.json";
import exponentials from "@/content/learning-packs/f05.json";

const packs = [arithmetic, algebra, functions, trigonometry, exponentials, measurement, vectors, calculus, complex, programming, engineering, orientation];
export const refresherReleaseStatus = (courseId: string) => packs.find(pack => pack.courseId === courseId)?.status;
export const refresherAvailable = (courseId: string) => ["preview", "reviewed"].includes(refresherReleaseStatus(courseId) ?? "");
