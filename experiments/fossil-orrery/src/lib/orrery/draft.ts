import { evaluate, holdReceipt, harvest } from "./engine.ts";

export function structuralDraft(recipe: {
  id: string;
  slots: { index: number; name: string; focus: string; supportingSourceId: string }[];
  constraints: { maxSectionTitleChars: number; maxSectionTextChars: number };
}) {
  return {
    schema: "sia/proposal/v0",
    recipeId: recipe.id,
    author: { kind: "human", name: "local-structural-draft" },
    title: `Draft: ${recipe.slots.map((slot) => slot.focus).slice(0, 3).join(" / ")}`.slice(0, 120),
    sections: recipe.slots.map((slot) => ({
      index: slot.index,
      slot: slot.name,
      title: `${slot.name}: ${slot.focus}`.slice(0, recipe.constraints.maxSectionTitleChars),
      text: `Structural draft only. Slot "${slot.name}" is bound to the source-derived token "${slot.focus}" and supporting record ${slot.supportingSourceId}. This sentence was written by the local draft instrument, not by a model and not by the source. It asserts no new facts about any recording.`.slice(
        0,
        recipe.constraints.maxSectionTextChars,
      ),
    })),
    motifsUsed: [...new Set(recipe.slots.map((slot) => slot.focus))],
    newMotifs: ["structural-draft"],
    sourceAssertion: "no new source facts asserted",
  };
}

export function reviewDraft(recipe: unknown, proposal: unknown) {
  const parsed = evaluate(recipe, proposal);
  const receipt = holdReceipt(recipe, proposal);
  return { proposal: parsed, receipt };
}

export function acceptDraft(recipe: any, proposal: unknown, explicitChoice: boolean) {
  if (explicitChoice !== true) throw new Error("Local selection requires an explicit human choice");
  return harvest(recipe, proposal, { explicitChoice: true });
}
