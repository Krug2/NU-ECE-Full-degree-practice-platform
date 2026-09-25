"use client";

import type { ModesActivity } from "@/lib/learning/phs-232-modes";
import { MathText } from "./math-text";
import { Phs232SuperpositionPanel } from "./phs-232-superposition-panel";
import { Phs232ReflectionPanel } from "./phs-232-reflection-panel";
import { Phs232StandingPanel } from "./phs-232-standing-panel";
import { Phs232CoupledPanel } from "./phs-232-coupled-panel";
import "./phs-232.css";

export function Phs232ModesLab({ activity }: { activity: ModesActivity }) {
  return <div className="phs232-investigation"><p><MathText>{activity.prompt}</MathText></p><p className="muted">These are ideal simulations, not physical experiments or official equipment requirements. Open one panel at a time or compare panels. Predictions and controls reset on reload; preserve parameters and representative evidence in saved lesson notes. No automatic motion is required.</p>
    <details open><summary>1. Coherent and counter-propagating waves</summary><Phs232SuperpositionPanel initial={activity.initial.superposition}/></details>
    <details><summary>2. Reflection and transmission</summary><Phs232ReflectionPanel initial={activity.initial.reflection}/></details>
    <details><summary>3. Finite-string boundary modes</summary><Phs232StandingPanel initial={activity.initial.standing}/></details>
    <details><summary>4. Coupled masses and beats</summary><Phs232CoupledPanel initial={activity.initial.coupled}/></details>
    <h4>Preserve a comparative investigation record</h4><p>Record the model, parameters, units, predictions, probe coordinates/times and representative rows for each comparison. Explain the applicable boundary equation, the difference between a permanent node and a momentary zero, and how power or energy was checked. Keep coupling-spring energy and numerical residuals in the record. Use the lesson notes below to save it.</p>
    <details><summary>Superposition and modes self-check rubric</summary><p>Score each item 0 for missing or incorrect, 1 for partial and 2 for complete evidence. Revise every score below 2. This proposed self-check is not an official grade and does not award objective evidence.</p><ol><li><strong>Reproducibility:</strong> parameters, units, initial states and probe locations/times identify the compared runs.</li><li><strong>Boundaries:</strong> displacement and force or slope evidence establishes the appropriate endpoint or junction condition.</li><li><strong>Nodes:</strong> a full time record distinguishes permanent nodes, envelope minima and an all-zero frame.</li><li><strong>Energy:</strong> signed flux, separate physical/modal accounts and refinement support the conservation claims.</li><li><strong>Limits:</strong> phase coherence, linearity, finite recording window and the difference between magnitude bounds and energy transfer are explained.</li></ol></details>
  </div>;
}
